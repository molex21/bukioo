-- migrate:up

CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(80) NOT NULL,
    email VARCHAR(320),
    phone VARCHAR(32),
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (id, organization_id)
);

CREATE UNIQUE INDEX businesses_organization_slug_unique
ON businesses (organization_id, LOWER(slug));

CREATE TABLE business_memberships (
    business_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (business_id, user_id),
    FOREIGN KEY (business_id, organization_id)
        REFERENCES businesses(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, user_id)
        REFERENCES organization_memberships(organization_id, user_id)
        ON DELETE CASCADE
);

INSERT INTO businesses (organization_id, name, slug, email, phone, timezone)
SELECT id, name, slug, email, phone, timezone
FROM organizations;

INSERT INTO business_memberships (business_id, user_id, organization_id)
SELECT businesses.id, organization_memberships.user_id, businesses.organization_id
FROM businesses
INNER JOIN organization_memberships
    ON organization_memberships.organization_id = businesses.organization_id;

ALTER TABLE employees ADD COLUMN business_id UUID;
ALTER TABLE service_categories ADD COLUMN business_id UUID;
ALTER TABLE services ADD COLUMN business_id UUID;
ALTER TABLE employee_services ADD COLUMN business_id UUID;
ALTER TABLE loyalty_levels ADD COLUMN business_id UUID;
ALTER TABLE customers ADD COLUMN business_id UUID;
ALTER TABLE employee_working_hours ADD COLUMN business_id UUID;
ALTER TABLE calendar_blocks ADD COLUMN business_id UUID;
ALTER TABLE appointments ADD COLUMN business_id UUID;
ALTER TABLE loyalty_transactions ADD COLUMN business_id UUID;
ALTER TABLE notifications ADD COLUMN business_id UUID;
ALTER TABLE audit_logs ADD COLUMN business_id UUID;

UPDATE employees SET business_id = businesses.id FROM businesses
WHERE businesses.organization_id = employees.organization_id;
UPDATE service_categories SET business_id = businesses.id FROM businesses
WHERE businesses.organization_id = service_categories.organization_id;
UPDATE services SET business_id = businesses.id FROM businesses
WHERE businesses.organization_id = services.organization_id;
UPDATE employee_services SET business_id = businesses.id FROM businesses
WHERE businesses.organization_id = employee_services.organization_id;
UPDATE loyalty_levels SET business_id = businesses.id FROM businesses
WHERE businesses.organization_id = loyalty_levels.organization_id;
UPDATE customers SET business_id = businesses.id FROM businesses
WHERE businesses.organization_id = customers.organization_id;
UPDATE employee_working_hours SET business_id = businesses.id FROM businesses
WHERE businesses.organization_id = employee_working_hours.organization_id;
UPDATE calendar_blocks SET business_id = businesses.id FROM businesses
WHERE businesses.organization_id = calendar_blocks.organization_id;
UPDATE appointments SET business_id = businesses.id FROM businesses
WHERE businesses.organization_id = appointments.organization_id;
UPDATE loyalty_transactions SET business_id = businesses.id FROM businesses
WHERE businesses.organization_id = loyalty_transactions.organization_id;
UPDATE notifications SET business_id = businesses.id FROM businesses
WHERE businesses.organization_id = notifications.organization_id;
UPDATE audit_logs SET business_id = businesses.id FROM businesses
WHERE businesses.organization_id = audit_logs.organization_id;

ALTER TABLE employees ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE service_categories ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE services ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE employee_services ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE loyalty_levels ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE employee_working_hours ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE calendar_blocks ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE loyalty_transactions ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN business_id SET NOT NULL;

ALTER TABLE employees ADD CONSTRAINT employees_business_tenant_fk
    FOREIGN KEY (business_id, organization_id)
    REFERENCES businesses(id, organization_id);
ALTER TABLE service_categories ADD CONSTRAINT service_categories_business_tenant_fk
    FOREIGN KEY (business_id, organization_id)
    REFERENCES businesses(id, organization_id);
ALTER TABLE services ADD CONSTRAINT services_business_tenant_fk
    FOREIGN KEY (business_id, organization_id)
    REFERENCES businesses(id, organization_id);
ALTER TABLE employee_services ADD CONSTRAINT employee_services_business_tenant_fk
    FOREIGN KEY (business_id, organization_id)
    REFERENCES businesses(id, organization_id);
ALTER TABLE loyalty_levels ADD CONSTRAINT loyalty_levels_business_tenant_fk
    FOREIGN KEY (business_id, organization_id)
    REFERENCES businesses(id, organization_id);
ALTER TABLE customers ADD CONSTRAINT customers_business_tenant_fk
    FOREIGN KEY (business_id, organization_id)
    REFERENCES businesses(id, organization_id);
ALTER TABLE employee_working_hours ADD CONSTRAINT employee_working_hours_business_tenant_fk
    FOREIGN KEY (business_id, organization_id)
    REFERENCES businesses(id, organization_id);
ALTER TABLE calendar_blocks ADD CONSTRAINT calendar_blocks_business_tenant_fk
    FOREIGN KEY (business_id, organization_id)
    REFERENCES businesses(id, organization_id);
ALTER TABLE appointments ADD CONSTRAINT appointments_business_tenant_fk
    FOREIGN KEY (business_id, organization_id)
    REFERENCES businesses(id, organization_id);
ALTER TABLE loyalty_transactions ADD CONSTRAINT loyalty_transactions_business_tenant_fk
    FOREIGN KEY (business_id, organization_id)
    REFERENCES businesses(id, organization_id);
ALTER TABLE notifications ADD CONSTRAINT notifications_business_tenant_fk
    FOREIGN KEY (business_id, organization_id)
    REFERENCES businesses(id, organization_id);
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_business_tenant_fk
    FOREIGN KEY (business_id, organization_id)
    REFERENCES businesses(id, organization_id);

CREATE INDEX businesses_organization_status_idx
ON businesses (organization_id, status);
CREATE INDEX employees_business_active_idx ON employees (business_id, is_active);
CREATE INDEX services_business_active_idx ON services (business_id, is_active);
CREATE INDEX customers_business_email_idx ON customers (business_id, email);
CREATE INDEX appointments_business_start_idx ON appointments (business_id, start_at);
CREATE INDEX notifications_business_status_idx ON notifications (business_id, status);

CREATE TRIGGER businesses_set_updated_at
BEFORE UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- migrate:down

DROP TRIGGER IF EXISTS businesses_set_updated_at ON businesses;
DROP INDEX IF EXISTS notifications_business_status_idx;
DROP INDEX IF EXISTS appointments_business_start_idx;
DROP INDEX IF EXISTS customers_business_email_idx;
DROP INDEX IF EXISTS services_business_active_idx;
DROP INDEX IF EXISTS employees_business_active_idx;
DROP INDEX IF EXISTS businesses_organization_status_idx;

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_business_tenant_fk;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_business_tenant_fk;
ALTER TABLE loyalty_transactions DROP CONSTRAINT IF EXISTS loyalty_transactions_business_tenant_fk;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_business_tenant_fk;
ALTER TABLE calendar_blocks DROP CONSTRAINT IF EXISTS calendar_blocks_business_tenant_fk;
ALTER TABLE employee_working_hours DROP CONSTRAINT IF EXISTS employee_working_hours_business_tenant_fk;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_business_tenant_fk;
ALTER TABLE loyalty_levels DROP CONSTRAINT IF EXISTS loyalty_levels_business_tenant_fk;
ALTER TABLE employee_services DROP CONSTRAINT IF EXISTS employee_services_business_tenant_fk;
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_business_tenant_fk;
ALTER TABLE service_categories DROP CONSTRAINT IF EXISTS service_categories_business_tenant_fk;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_business_tenant_fk;

ALTER TABLE audit_logs DROP COLUMN IF EXISTS business_id;
ALTER TABLE notifications DROP COLUMN IF EXISTS business_id;
ALTER TABLE loyalty_transactions DROP COLUMN IF EXISTS business_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS business_id;
ALTER TABLE calendar_blocks DROP COLUMN IF EXISTS business_id;
ALTER TABLE employee_working_hours DROP COLUMN IF EXISTS business_id;
ALTER TABLE customers DROP COLUMN IF EXISTS business_id;
ALTER TABLE loyalty_levels DROP COLUMN IF EXISTS business_id;
ALTER TABLE employee_services DROP COLUMN IF EXISTS business_id;
ALTER TABLE services DROP COLUMN IF EXISTS business_id;
ALTER TABLE service_categories DROP COLUMN IF EXISTS business_id;
ALTER TABLE employees DROP COLUMN IF EXISTS business_id;

DROP TABLE IF EXISTS business_memberships;
DROP INDEX IF EXISTS businesses_organization_slug_unique;
DROP TABLE IF EXISTS businesses;
