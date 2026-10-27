-- migrate:up
-- Global blocks lock all employees; individual blocks only lock their employee.
-- This also avoids a lock-order inversion after an individual command locked its owner.
CREATE OR REPLACE FUNCTION scheduling_lock() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e uuid; org uuid; biz uuid; old_emp uuid; new_emp uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN old_emp:=OLD.employee_id; END IF;
 IF TG_OP<>'DELETE' THEN new_emp:=NEW.employee_id; END IF;
 org:=CASE WHEN TG_OP='DELETE' THEN OLD.organization_id ELSE NEW.organization_id END;
 biz:=CASE WHEN TG_OP='DELETE' THEN OLD.business_id ELSE NEW.business_id END;
 FOR e IN SELECT id FROM employees WHERE organization_id=org AND business_id=biz
  AND (id=old_emp OR id=new_emp OR (TG_TABLE_NAME='calendar_blocks' AND
    ((TG_OP<>'INSERT' AND old_emp IS NULL) OR (TG_OP<>'DELETE' AND new_emp IS NULL))))
  ORDER BY id FOR UPDATE LOOP
  IF TG_TABLE_NAME<>'appointments' THEN
   INSERT INTO employee_schedule_versions(organization_id,business_id,employee_id,version) VALUES(org,biz,e,1)
   ON CONFLICT(employee_id) DO UPDATE SET version=employee_schedule_versions.version+1;
  END IF;
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;

-- migrate:down
DO $$ BEGIN RAISE EXCEPTION 'Review the scheduling lock protocol before reverting this migration.'; END $$;
