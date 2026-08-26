-- migrate:up

ALTER TABLE appointments
ADD CONSTRAINT appointments_employee_occupied_time_excl
EXCLUDE USING gist (
    employee_id WITH =,
    tstzrange(occupied_start_at, occupied_end_at, '[)') WITH &&
)
WHERE (status IN ('PENDING', 'CONFIRMED'));

-- migrate:down

ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS appointments_employee_occupied_time_excl;
