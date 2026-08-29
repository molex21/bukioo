-- migrate:up

CREATE TABLE customer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(320) NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id, organization_id)
);

CREATE UNIQUE INDEX customer_accounts_organization_lower_email_unique
    ON customer_accounts (organization_id, LOWER(email));

ALTER TABLE customers
    ADD COLUMN customer_account_id UUID;

ALTER TABLE customers
    ADD CONSTRAINT customers_customer_account_tenant_fk
    FOREIGN KEY (customer_account_id, organization_id)
    REFERENCES customer_accounts(id, organization_id)
    ON DELETE SET NULL;

CREATE INDEX customers_customer_account_idx
    ON customers (customer_account_id)
    WHERE customer_account_id IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS customers_customer_account_idx;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_customer_account_tenant_fk;
ALTER TABLE customers DROP COLUMN IF EXISTS customer_account_id;
DROP INDEX IF EXISTS customer_accounts_organization_lower_email_unique;
DROP TABLE IF EXISTS customer_accounts;
