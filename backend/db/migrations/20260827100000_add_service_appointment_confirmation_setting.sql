-- migrate:up

ALTER TABLE services
ADD COLUMN auto_confirm_appointments BOOLEAN;

-- migrate:down

ALTER TABLE services
DROP COLUMN IF EXISTS auto_confirm_appointments;
