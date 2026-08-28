-- migrate:up

ALTER TABLE appointments
ADD COLUMN requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN conflict_override BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE appointments
DROP CONSTRAINT appointments_employee_occupied_time_excl;

ALTER TABLE appointments
ADD CONSTRAINT appointments_employee_occupied_time_excl
EXCLUDE USING gist (
    employee_id WITH =,
    tstzrange(occupied_start_at, occupied_end_at, '[)') WITH &&
)
WHERE (status = 'CONFIRMED' AND conflict_override = FALSE);

-- migrate:down

ALTER TABLE appointments
DROP CONSTRAINT appointments_employee_occupied_time_excl;

ALTER TABLE appointments
DROP COLUMN IF EXISTS conflict_override,
DROP COLUMN IF EXISTS requires_approval;

ALTER TABLE appointments
ADD CONSTRAINT appointments_employee_occupied_time_excl
EXCLUDE USING gist (
    employee_id WITH =,
    tstzrange(occupied_start_at, occupied_end_at, '[)') WITH &&
)
WHERE (status IN ('PENDING', 'CONFIRMED'));
