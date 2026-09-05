-- migrate:up

ALTER TABLE users ADD COLUMN phone VARCHAR(32);

-- migrate:down

ALTER TABLE users DROP COLUMN phone;
