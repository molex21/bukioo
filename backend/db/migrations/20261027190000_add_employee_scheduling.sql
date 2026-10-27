-- migrate:up
ALTER TABLE employees ADD CONSTRAINT employees_schedule_scope_key UNIQUE (id, business_id, organization_id);

CREATE TABLE employee_shift_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  business_id uuid NOT NULL, name varchar(100) NOT NULL,
  pattern jsonb NOT NULL CHECK (jsonb_typeof(pattern) = 'array' AND jsonb_array_length(pattern) BETWEEN 1 AND 12),
  version integer NOT NULL DEFAULT 1, archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id, business_id, organization_id),
  FOREIGN KEY(business_id, organization_id) REFERENCES businesses(id, organization_id)
);
CREATE TABLE employee_shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, business_id uuid NOT NULL,
  employee_id uuid NOT NULL, template_id uuid, template_version integer,
  pattern_snapshot jsonb NOT NULL, anchor_date date NOT NULL, phase_weeks integer NOT NULL DEFAULT 0,
  valid_from date NOT NULL, valid_to date, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(valid_to IS NULL OR valid_to >= valid_from),
  FOREIGN KEY(employee_id,business_id,organization_id) REFERENCES employees(id,business_id,organization_id),
  FOREIGN KEY(template_id,business_id,organization_id) REFERENCES employee_shift_templates(id,business_id,organization_id),
  EXCLUDE USING gist (employee_id WITH =, daterange(valid_from,valid_to,'[]') WITH &&) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE employee_schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, business_id uuid NOT NULL,
  employee_id uuid NOT NULL, work_date date NOT NULL, spans jsonb NOT NULL CHECK(jsonb_typeof(spans)='array'),
  updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(employee_id,work_date),
  FOREIGN KEY(employee_id,business_id,organization_id) REFERENCES employees(id,business_id,organization_id)
);
CREATE TABLE employee_schedule_versions (
  organization_id uuid NOT NULL, business_id uuid NOT NULL, employee_id uuid PRIMARY KEY,
  version integer NOT NULL DEFAULT 0,
  FOREIGN KEY(employee_id,business_id,organization_id) REFERENCES employees(id,business_id,organization_id)
);
CREATE INDEX employee_shift_assignments_scope ON employee_shift_assignments(business_id,organization_id,employee_id,valid_from);
CREATE INDEX employee_schedule_exceptions_scope ON employee_schedule_exceptions(business_id,organization_id,work_date);
ALTER TABLE calendar_blocks ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE calendar_blocks DROP CONSTRAINT calendar_blocks_type_check;
ALTER TABLE calendar_blocks ADD CONSTRAINT calendar_blocks_type_check CHECK(type IN
 ('BREAK','MEETING','VACATION','ABSENCE','PERSONAL','HOLIDAY','MANUAL_BLOCK','OTHER','PERMISSION'));

-- NULL means the wall-clock time is ambiguous or nonexistent. No silent DST choice.
CREATE FUNCTION scheduling_instant(local_time timestamp, zone text) RETURNS timestamptz
LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN count(*)=1 THEN min(candidate) ELSE NULL END
 FROM generate_series((local_time AT TIME ZONE zone)-interval '26 hours',
   (local_time AT TIME ZONE zone)+interval '26 hours',interval '15 minutes') candidate
 WHERE candidate AT TIME ZONE zone = local_time;
$$;

-- Canonical day pattern, minutes relative to its local midnight. End may be >1440.
CREATE FUNCTION scheduling_pattern(org uuid,biz uuid,emp uuid,day date)
RETURNS TABLE(spans jsonb,origin text) LANGUAGE plpgsql STABLE AS $$
DECLARE a employee_shift_assignments; p jsonb; n integer; k integer;
BEGIN
 SELECT e.spans INTO p FROM employee_schedule_exceptions e
 WHERE e.organization_id=org AND e.business_id=biz AND e.employee_id=emp AND e.work_date=day;
 IF FOUND THEN RETURN QUERY SELECT p,'exception'::text; RETURN; END IF;
 SELECT * INTO a FROM employee_shift_assignments s WHERE s.organization_id=org AND s.business_id=biz
 AND s.employee_id=emp AND day>=s.valid_from AND (s.valid_to IS NULL OR day<=s.valid_to);
 IF FOUND THEN
   n:=jsonb_array_length(a.pattern_snapshot);
   k:=((floor((day-a.anchor_date)::numeric/7)::integer+a.phase_weeks)%n+n)%n;
   RETURN QUERY SELECT a.pattern_snapshot->k->(extract(dow FROM day)::integer),'cycle'::text; RETURN;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('start',extract(epoch FROM h.start_time)::integer/60,
  'end',extract(epoch FROM h.end_time)::integer/60,'pauses','[]'::jsonb) ORDER BY h.start_time),'[]'::jsonb)
 INTO p FROM employee_working_hours h WHERE h.organization_id=org AND h.business_id=biz AND h.employee_id=emp
 AND h.day_of_week=extract(dow FROM day) AND (h.valid_from IS NULL OR day>=h.valid_from) AND (h.valid_to IS NULL OR day<=h.valid_to);
 RETURN QUERY SELECT p,'base'::text;
END $$;

CREATE FUNCTION scheduling_day(org uuid,biz uuid,emp uuid,day date)
RETURNS TABLE(presence tstzmultirange,attention tstzmultirange,origin text,ambiguous boolean)
LANGUAGE plpgsql STABLE AS $$
DECLARE zone text; lower_day timestamptz; upper_day timestamptz; src date; pattern jsonb;
 span jsonb; pause jsonb; a timestamptz; b timestamptz; pa timestamptz; pb timestamptz;
 piece tstzmultirange; occupied tstzmultirange; has_exception boolean; ignored text;
BEGIN
 SELECT timezone INTO zone FROM businesses WHERE id=biz AND organization_id=org;
 IF zone IS NULL THEN RETURN; END IF;
 presence:='{}'; attention:='{}'; ambiguous:=false;
 lower_day:=scheduling_instant(day::timestamp,zone); upper_day:=scheduling_instant((day+1)::timestamp,zone);
 SELECT p.origin INTO origin FROM scheduling_pattern(org,biz,emp,day) p;
 has_exception:=origin='exception';
 IF lower_day IS NULL OR upper_day IS NULL THEN ambiguous:=true; RETURN NEXT; RETURN; END IF;
 FOREACH src IN ARRAY ARRAY[day-1,day] LOOP
  IF src<day AND has_exception THEN CONTINUE; END IF;
  SELECT p.spans,p.origin INTO pattern,ignored FROM scheduling_pattern(org,biz,emp,src) p;
  FOR span IN SELECT value FROM jsonb_array_elements(coalesce(pattern,'[]')) LOOP
   a:=scheduling_instant(src::timestamp+make_interval(mins=>(span->>'start')::int),zone);
   b:=scheduling_instant(src::timestamp+make_interval(mins=>(span->>'end')::int),zone);
   IF a IS NULL OR b IS NULL THEN ambiguous:=true; CONTINUE; END IF;
   IF a>=upper_day OR b<=lower_day OR a>=b THEN CONTINUE; END IF;
   piece:=tstzmultirange(tstzrange(greatest(a,lower_day),least(b,upper_day),'[)'));
   presence:=presence+piece;
   FOR pause IN SELECT value FROM jsonb_array_elements(coalesce(span->'pauses','[]')) LOOP
    pa:=scheduling_instant(src::timestamp+make_interval(mins=>(pause->>'start')::int),zone);
    pb:=scheduling_instant(src::timestamp+make_interval(mins=>(pause->>'end')::int),zone);
    IF pa IS NULL OR pb IS NULL THEN ambiguous:=true;
    ELSIF pa<pb THEN piece:=piece-tstzmultirange(tstzrange(pa,pb,'[)')); END IF;
   END LOOP;
   attention:=attention+piece;
  END LOOP;
 END LOOP;
 SELECT coalesce(range_agg(tstzrange(c.start_at,c.end_at,'[)')),'{}'::tstzmultirange) INTO occupied
 FROM calendar_blocks c WHERE c.organization_id=org AND c.business_id=biz AND (c.employee_id=emp OR c.employee_id IS NULL)
 AND c.start_at<upper_day AND c.end_at>lower_day;
 attention:=attention-occupied;
 IF ambiguous THEN attention:='{}'; END IF;
 RETURN NEXT;
END $$;

CREATE FUNCTION scheduling_covers(org uuid,biz uuid,emp uuid,a timestamptz,b timestamptz)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT a<b AND coalesce(range_agg(piece),'{}'::tstzmultirange) @> tstzrange(a,b,'[)')
 FROM businesses business
 CROSS JOIN LATERAL generate_series((a AT TIME ZONE business.timezone)::date::timestamp,
   (b AT TIME ZONE business.timezone)::date::timestamp,interval '1 day') date
 CROSS JOIN LATERAL scheduling_day(org,biz,emp,date::date) effective
 CROSS JOIN LATERAL unnest(effective.attention) piece
 WHERE business.id=biz AND business.organization_id=org;
$$;

-- Locks are shared by appointments, legacy editors and the new scheduling API.
CREATE FUNCTION scheduling_lock() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e uuid; org uuid; biz uuid; old_emp uuid; new_emp uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN old_emp:=OLD.employee_id; END IF;
 IF TG_OP<>'DELETE' THEN new_emp:=NEW.employee_id; END IF;
 org:=CASE WHEN TG_OP='DELETE' THEN OLD.organization_id ELSE NEW.organization_id END;
 biz:=CASE WHEN TG_OP='DELETE' THEN OLD.business_id ELSE NEW.business_id END;
 FOR e IN SELECT id FROM employees WHERE organization_id=org AND business_id=biz
  AND (id=old_emp OR id=new_emp OR (TG_TABLE_NAME='calendar_blocks' AND (old_emp IS NULL OR new_emp IS NULL)))
  ORDER BY id FOR UPDATE LOOP
  IF TG_TABLE_NAME<>'appointments' THEN
   INSERT INTO employee_schedule_versions(organization_id,business_id,employee_id,version) VALUES(org,biz,e,1)
   ON CONFLICT(employee_id) DO UPDATE SET version=employee_schedule_versions.version+1;
  END IF;
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;

CREATE FUNCTION scheduling_assert_citations(org uuid,biz uuid,emp uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE conflicts jsonb;
BEGIN
 SELECT jsonb_agg(jsonb_build_object('id',a.id,'startAt',a.start_at,'employeeId',a.employee_id)) INTO conflicts
 FROM appointments a WHERE a.organization_id=org AND a.business_id=biz AND (emp IS NULL OR a.employee_id=emp)
 AND a.status IN ('PENDING','CONFIRMED') AND a.occupied_end_at>now()
 AND NOT scheduling_covers(org,biz,a.employee_id,a.occupied_start_at,a.occupied_end_at);
 IF conflicts IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='scheduling_conflict',DETAIL=conflicts::text; END IF;
END $$;
CREATE FUNCTION scheduling_check_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN PERFORM scheduling_assert_citations(OLD.organization_id,OLD.business_id,OLD.employee_id);
 ELSE PERFORM scheduling_assert_citations(NEW.organization_id,NEW.business_id,NEW.employee_id); END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION scheduling_check_appointment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status IN ('PENDING','CONFIRMED') AND NEW.occupied_end_at>now()
 AND NOT scheduling_covers(NEW.organization_id,NEW.business_id,NEW.employee_id,NEW.occupied_start_at,NEW.occupied_end_at)
 THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='scheduling_conflict',DETAIL=jsonb_build_array(jsonb_build_object('id',NEW.id,'startAt',NEW.start_at,'employeeId',NEW.employee_id))::text; END IF;
 RETURN NULL;
END $$;

CREATE TRIGGER scheduling_appointments_lock BEFORE INSERT OR UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION scheduling_lock();
CREATE CONSTRAINT TRIGGER scheduling_appointments_check AFTER INSERT OR UPDATE ON appointments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION scheduling_check_appointment();
CREATE TRIGGER scheduling_hours_lock BEFORE INSERT OR UPDATE OR DELETE ON employee_working_hours FOR EACH ROW EXECUTE FUNCTION scheduling_lock();
CREATE CONSTRAINT TRIGGER scheduling_hours_check AFTER INSERT OR UPDATE OR DELETE ON employee_working_hours DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION scheduling_check_change();
CREATE TRIGGER scheduling_blocks_lock BEFORE INSERT OR UPDATE OR DELETE ON calendar_blocks FOR EACH ROW EXECUTE FUNCTION scheduling_lock();
CREATE CONSTRAINT TRIGGER scheduling_blocks_check AFTER INSERT OR UPDATE OR DELETE ON calendar_blocks DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION scheduling_check_change();
CREATE TRIGGER scheduling_assignments_lock BEFORE INSERT OR UPDATE OR DELETE ON employee_shift_assignments FOR EACH ROW EXECUTE FUNCTION scheduling_lock();
CREATE CONSTRAINT TRIGGER scheduling_assignments_check AFTER INSERT OR UPDATE OR DELETE ON employee_shift_assignments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION scheduling_check_change();
CREATE TRIGGER scheduling_exceptions_lock BEFORE INSERT OR UPDATE OR DELETE ON employee_schedule_exceptions FOR EACH ROW EXECUTE FUNCTION scheduling_lock();
CREATE CONSTRAINT TRIGGER scheduling_exceptions_check AFTER INSERT OR UPDATE OR DELETE ON employee_schedule_exceptions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION scheduling_check_change();

-- migrate:down
DO $$ BEGIN RAISE EXCEPTION 'Automatic rollback disabled: export scheduling data and review a data-preserving reversal first.'; END $$;
