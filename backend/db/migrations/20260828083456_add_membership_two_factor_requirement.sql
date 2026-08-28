-- migrate:up

ALTER TABLE organization_memberships
ADD COLUMN require_two_factor BOOLEAN NOT NULL DEFAULT FALSE;

-- migrate:down

ALTER TABLE organization_memberships
DROP COLUMN require_two_factor;
