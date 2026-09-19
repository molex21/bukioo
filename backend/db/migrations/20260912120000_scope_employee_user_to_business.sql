-- migrate:up
ALTER TABLE employees
    DROP CONSTRAINT employees_organization_id_user_id_key;
ALTER TABLE employees
    ADD CONSTRAINT employees_business_id_user_id_key UNIQUE (business_id, user_id);

-- migrate:down
-- Refuse rollback if a user now has profiles in multiple businesses of one org.
ALTER TABLE employees
    ADD CONSTRAINT employees_organization_id_user_id_key UNIQUE (organization_id, user_id);
ALTER TABLE employees
    DROP CONSTRAINT employees_business_id_user_id_key;
