-- migrate:up

ALTER TABLE users
ADD COLUMN first_name VARCHAR(100),
ADD COLUMN last_name VARCHAR(150);

-- migrate:down

ALTER TABLE users
DROP COLUMN IF EXISTS last_name,
DROP COLUMN IF EXISTS first_name;
