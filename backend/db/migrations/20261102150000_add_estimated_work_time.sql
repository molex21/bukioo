-- migrate:up
CREATE FUNCTION scheduling_intervals(org uuid,biz uuid,emp uuid,day date)
RETURNS TABLE(presence tstzmultirange,attention tstzmultirange,work tstzmultirange,origin text,ambiguous boolean)
LANGUAGE plpgsql STABLE AS $$
DECLARE zone text; lower_day timestamptz; upper_day timestamptz; src date; pattern jsonb;
 span jsonb; pause jsonb; a timestamptz; b timestamptz; pa timestamptz; pb timestamptz;
 piece tstzmultirange; work_piece tstzmultirange; occupied tstzmultirange;
 has_exception boolean; source_origin text; cycle_end date;
BEGIN
 SELECT timezone INTO zone FROM businesses WHERE id=biz AND organization_id=org;
 IF zone IS NULL THEN RETURN; END IF;
 presence:='{}'; attention:='{}'; work:='{}'; ambiguous:=false;
 lower_day:=scheduling_instant(day::timestamp,zone); upper_day:=scheduling_instant((day+1)::timestamp,zone);
 SELECT p.origin INTO origin FROM scheduling_pattern(org,biz,emp,day) p;
 has_exception:=origin='exception';
 IF lower_day IS NULL OR upper_day IS NULL THEN ambiguous:=true; RETURN NEXT; RETURN; END IF;
 FOREACH src IN ARRAY ARRAY[day-1,day] LOOP
  IF src<day AND has_exception THEN CONTINUE; END IF;
  SELECT p.spans,p.origin INTO pattern,source_origin FROM scheduling_pattern(org,biz,emp,src) p;
  cycle_end:=NULL;
  IF source_origin='cycle' THEN
   SELECT valid_to INTO cycle_end FROM employee_shift_assignments s
    WHERE s.organization_id=org AND s.business_id=biz AND s.employee_id=emp
    AND src>=s.valid_from AND (s.valid_to IS NULL OR src<=s.valid_to);
  END IF;
  FOR span IN SELECT value FROM jsonb_array_elements(coalesce(pattern,'[]')) LOOP
   a:=scheduling_instant(src::timestamp+make_interval(mins=>(span->>'start')::int),zone);
   b:=scheduling_instant(src::timestamp+make_interval(mins=>(span->>'end')::int),zone);
   IF a IS NULL OR b IS NULL THEN ambiguous:=true; CONTINUE; END IF;
   IF cycle_end IS NOT NULL THEN b:=least(b,(cycle_end+1)::timestamp AT TIME ZONE zone); END IF;
   IF a>=upper_day OR b<=lower_day OR a>=b THEN CONTINUE; END IF;
   piece:=tstzmultirange(tstzrange(greatest(a,lower_day),least(b,upper_day),'[)'));
   presence:=presence+piece; work_piece:=piece;
   FOR pause IN SELECT value FROM jsonb_array_elements(coalesce(span->'pauses','[]')) LOOP
    pa:=scheduling_instant(src::timestamp+make_interval(mins=>(pause->>'start')::int),zone);
    pb:=scheduling_instant(src::timestamp+make_interval(mins=>(pause->>'end')::int),zone);
    IF pa IS NULL OR pb IS NULL THEN ambiguous:=true;
    ELSIF pa<pb THEN
     piece:=piece-tstzmultirange(tstzrange(pa,pb,'[)'));
     IF NOT coalesce((pause->>'countsAsWork')::boolean,false) THEN
      work_piece:=work_piece-tstzmultirange(tstzrange(pa,pb,'[)'));
     END IF;
    END IF;
   END LOOP;
   attention:=attention+piece; work:=work+work_piece;
  END LOOP;
 END LOOP;
 SELECT coalesce(range_agg(tstzrange(c.start_at,c.end_at,'[)')),'{}'::tstzmultirange) INTO occupied
 FROM calendar_blocks c WHERE c.organization_id=org AND c.business_id=biz AND (c.employee_id=emp OR c.employee_id IS NULL)
 AND c.start_at<upper_day AND c.end_at>lower_day;
 attention:=attention-occupied;
 IF ambiguous THEN attention:='{}'; work:='{}'; END IF;
 RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION scheduling_day(org uuid,biz uuid,emp uuid,day date)
RETURNS TABLE(presence tstzmultirange,attention tstzmultirange,origin text,ambiguous boolean)
LANGUAGE sql STABLE AS $$ SELECT presence,attention,origin,ambiguous FROM scheduling_intervals(org,biz,emp,day) $$;

CREATE FUNCTION scheduling_work_minutes(org uuid,biz uuid,emp uuid,day date) RETURNS numeric
LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN s.ambiguous THEN NULL ELSE
  (SELECT coalesce(sum(extract(epoch FROM upper(r)-lower(r)))/60,0) FROM unnest(s.work) r) END
 FROM scheduling_intervals(org,biz,emp,day) s;
$$;

-- Abort rather than leave an existing future appointment outside its schedule.
DO $$ DECLARE a record; BEGIN
 FOR a IN SELECT DISTINCT organization_id,business_id,employee_id FROM appointments
  WHERE status IN ('PENDING','CONFIRMED') AND occupied_end_at>now() LOOP
  PERFORM scheduling_assert_citations(a.organization_id,a.business_id,a.employee_id);
 END LOOP;
END $$;

-- migrate:down
DO $$ BEGIN RAISE EXCEPTION 'Revisar conservación de pausas y límites de rotaciones antes de revertir'; END $$;
