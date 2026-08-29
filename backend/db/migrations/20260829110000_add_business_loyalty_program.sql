-- migrate:up

CREATE TABLE business_loyalty_settings (
    business_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    loyalty_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    default_earning_type VARCHAR(30) NOT NULL DEFAULT 'NONE'
        CHECK (default_earning_type IN ('NONE', 'FIXED', 'AMOUNT_MULTIPLIER', 'BOTH')),
    default_fixed_points INTEGER
        CHECK (default_fixed_points IS NULL OR default_fixed_points >= 0),
    default_points_per_currency_unit NUMERIC(10,4)
        CHECK (default_points_per_currency_unit IS NULL OR default_points_per_currency_unit >= 0),
    points_expiration_months INTEGER DEFAULT 12
        CHECK (points_expiration_months IS NULL OR points_expiration_months BETWEEN 1 AND 120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (business_id, organization_id)
        REFERENCES businesses(id, organization_id) ON DELETE CASCADE
);

INSERT INTO business_loyalty_settings (
    business_id, organization_id, loyalty_enabled, default_earning_type,
    default_fixed_points, default_points_per_currency_unit, points_expiration_months
)
SELECT
    businesses.id,
    businesses.organization_id,
    organization_settings.loyalty_enabled,
    CASE organization_settings.loyalty_earning_mode
        WHEN 'MONEY' THEN 'AMOUNT_MULTIPLIER'
        WHEN 'APPOINTMENTS' THEN 'FIXED'
        WHEN 'BOTH' THEN 'BOTH'
        ELSE 'NONE'
    END,
    organization_settings.points_per_completed_appointment,
    organization_settings.points_per_currency_unit,
    12
FROM businesses
INNER JOIN organization_settings
    ON organization_settings.organization_id = businesses.organization_id;

CREATE TRIGGER business_loyalty_settings_set_updated_at
BEFORE UPDATE ON business_loyalty_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE services
    ADD COLUMN loyalty_earning_type VARCHAR(30) NOT NULL DEFAULT 'INHERIT'
        CHECK (loyalty_earning_type IN ('INHERIT', 'NONE', 'FIXED', 'AMOUNT_MULTIPLIER', 'BOTH')),
    ADD COLUMN loyalty_fixed_points INTEGER
        CHECK (loyalty_fixed_points IS NULL OR loyalty_fixed_points >= 0),
    ADD COLUMN loyalty_points_per_currency_unit NUMERIC(10,4)
        CHECK (loyalty_points_per_currency_unit IS NULL OR loyalty_points_per_currency_unit >= 0);

ALTER TABLE appointments ADD COLUMN loyalty_rule_snapshot JSONB;
ALTER TABLE loyalty_transactions ADD COLUMN expires_at TIMESTAMPTZ;

CREATE TABLE appointment_loyalty_awards (
    appointment_id UUID PRIMARY KEY REFERENCES appointments(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    points_awarded INTEGER NOT NULL CHECK (points_awarded >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_award_transaction_id UUID REFERENCES loyalty_transactions(id) ON DELETE SET NULL,
    last_reversal_transaction_id UUID REFERENCES loyalty_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (appointment_id, organization_id)
        REFERENCES appointments(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (business_id, organization_id)
        REFERENCES businesses(id, organization_id),
    FOREIGN KEY (customer_id, organization_id)
        REFERENCES customers(id, organization_id)
);

CREATE TRIGGER appointment_loyalty_awards_set_updated_at
BEFORE UPDATE ON appointment_loyalty_awards
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX loyalty_transactions_customer_created_idx
    ON loyalty_transactions (customer_id, created_at DESC);

-- migrate:down

DROP INDEX IF EXISTS loyalty_transactions_customer_created_idx;
DROP TRIGGER IF EXISTS appointment_loyalty_awards_set_updated_at ON appointment_loyalty_awards;
DROP TABLE IF EXISTS appointment_loyalty_awards;
ALTER TABLE loyalty_transactions DROP COLUMN IF EXISTS expires_at;
ALTER TABLE appointments DROP COLUMN IF EXISTS loyalty_rule_snapshot;
ALTER TABLE services
    DROP COLUMN IF EXISTS loyalty_points_per_currency_unit,
    DROP COLUMN IF EXISTS loyalty_fixed_points,
    DROP COLUMN IF EXISTS loyalty_earning_type;
DROP TRIGGER IF EXISTS business_loyalty_settings_set_updated_at ON business_loyalty_settings;
DROP TABLE IF EXISTS business_loyalty_settings;
