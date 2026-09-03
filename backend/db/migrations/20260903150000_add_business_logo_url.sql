-- migrate:up

ALTER TABLE businesses
ADD COLUMN logo_url TEXT;

-- migrate:down

ALTER TABLE businesses
DROP COLUMN IF EXISTS logo_url;
