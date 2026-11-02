-- migrate:up
ALTER TABLE employee_shift_templates ADD COLUMN kind text NOT NULL DEFAULT 'CYCLE'
 CHECK (kind IN ('DAY','CYCLE'));

CREATE TABLE employee_weekly_bases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
 business_id uuid NOT NULL, employee_id uuid NOT NULL, valid_from date NOT NULL,
 pattern jsonb NOT NULL CHECK (jsonb_typeof(pattern)='array' AND jsonb_array_length(pattern)=7),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(employee_id,valid_from),
 FOREIGN KEY(employee_id,business_id,organization_id) REFERENCES employees(id,business_id,organization_id)
);
CREATE TRIGGER scheduling_bases_lock BEFORE INSERT OR UPDATE OR DELETE ON employee_weekly_bases
 FOR EACH ROW EXECUTE FUNCTION scheduling_lock();
CREATE CONSTRAINT TRIGGER scheduling_bases_check AFTER INSERT OR UPDATE OR DELETE ON employee_weekly_bases
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION scheduling_check_change();

CREATE OR REPLACE FUNCTION scheduling_pattern(org uuid,biz uuid,emp uuid,day date)
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
 SELECT b.pattern->(extract(dow FROM day)::integer) INTO p FROM employee_weekly_bases b
 WHERE b.organization_id=org AND b.business_id=biz AND b.employee_id=emp AND b.valid_from<=day
 ORDER BY b.valid_from DESC LIMIT 1;
 IF FOUND THEN RETURN QUERY SELECT p,'base'::text; RETURN; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('start',extract(epoch FROM h.start_time)::integer/60,
  'end',extract(epoch FROM h.end_time)::integer/60,'pauses','[]'::jsonb) ORDER BY h.start_time),'[]'::jsonb)
 INTO p FROM employee_working_hours h WHERE h.organization_id=org AND h.business_id=biz AND h.employee_id=emp
 AND h.day_of_week=extract(dow FROM day) AND (h.valid_from IS NULL OR day>=h.valid_from) AND (h.valid_to IS NULL OR day<=h.valid_to);
 RETURN QUERY SELECT p,'base'::text;
END $$;

-- migrate:down
DO $$ BEGIN RAISE EXCEPTION 'Planificar reversión con conservación de plantillas y horarios antes de retirar este esquema'; END $$;
