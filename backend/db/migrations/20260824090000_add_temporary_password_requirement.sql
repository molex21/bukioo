-- migrate:up

ALTER TABLE users
ADD COLUMN password_change_required BOOLEAN NOT NULL DEFAULT FALSE;

-- migrate:down

ALTER TABLE users
DROP COLUMN password_change_required;
