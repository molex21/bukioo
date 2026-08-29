-- migrate:up

ALTER TABLE appointments
    ADD COLUMN counts_toward_membership BOOLEAN NOT NULL DEFAULT FALSE;

-- migrate:down

ALTER TABLE appointments
    DROP COLUMN IF EXISTS counts_toward_membership;
