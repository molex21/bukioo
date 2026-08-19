-- migrate:up

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- =========================================================
-- UPDATED_AT
-- =========================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =========================================================
-- ORGANIZATIONS
-- =========================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,
    slug VARCHAR(80) NOT NULL,

    email VARCHAR(320) NOT NULL,
    phone VARCHAR(32),

    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    currency_code CHAR(3) NOT NULL DEFAULT 'EUR',

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUSPENDED')),

    logo_url TEXT,
    primary_color VARCHAR(7),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX organizations_slug_unique
ON organizations (LOWER(slug));


-- =========================================================
-- ORGANIZATION LOCALES
-- =========================================================

CREATE TABLE organization_locales (
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,

    locale VARCHAR(10) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (organization_id, locale)
);

CREATE UNIQUE INDEX organization_locales_one_default
ON organization_locales (organization_id)
WHERE is_default = TRUE;


-- =========================================================
-- ORGANIZATION SETTINGS
-- =========================================================

CREATE TABLE organization_settings (
    organization_id UUID PRIMARY KEY
        REFERENCES organizations(id) ON DELETE CASCADE,

    minimum_booking_notice_minutes INTEGER NOT NULL DEFAULT 0
        CHECK (minimum_booking_notice_minutes >= 0),

    maximum_booking_advance_days INTEGER NOT NULL DEFAULT 60
        CHECK (maximum_booking_advance_days > 0),

    same_day_booking BOOLEAN NOT NULL DEFAULT TRUE,

    slot_interval_minutes INTEGER NOT NULL DEFAULT 15
        CHECK (slot_interval_minutes > 0),

    minimum_cancel_notice_minutes INTEGER NOT NULL DEFAULT 0
        CHECK (minimum_cancel_notice_minutes >= 0),

    minimum_reschedule_notice_minutes INTEGER NOT NULL DEFAULT 0
        CHECK (minimum_reschedule_notice_minutes >= 0),

    auto_confirm_appointments BOOLEAN NOT NULL DEFAULT TRUE,

    allow_guest_booking BOOLEAN NOT NULL DEFAULT TRUE,

    require_2fa_for_admins BOOLEAN NOT NULL DEFAULT FALSE,

    loyalty_enabled BOOLEAN NOT NULL DEFAULT FALSE,

    loyalty_earning_mode VARCHAR(20)
        CHECK (
            loyalty_earning_mode IS NULL
            OR loyalty_earning_mode IN ('MONEY', 'APPOINTMENTS', 'BOTH')
        ),

    points_per_currency_unit NUMERIC(10,4)
        CHECK (
            points_per_currency_unit IS NULL
            OR points_per_currency_unit >= 0
        ),

    points_per_completed_appointment INTEGER
        CHECK (
            points_per_completed_appointment IS NULL
            OR points_per_completed_appointment >= 0
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(320) NOT NULL,
    password_hash TEXT NOT NULL,

    email_verified_at TIMESTAMPTZ,

    preferred_locale VARCHAR(10) NOT NULL DEFAULT 'es',

    is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'BLOCKED', 'PENDING')),

    last_login_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_email_unique
ON users (LOWER(email));


-- =========================================================
-- USER SESSIONS
-- =========================================================

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    refresh_token_hash TEXT NOT NULL,

    user_agent TEXT,
    ip_address INET,

    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_sessions_user_id_idx
ON user_sessions (user_id);


-- =========================================================
-- TWO FACTOR
-- =========================================================

CREATE TABLE user_two_factor (
    user_id UUID PRIMARY KEY
        REFERENCES users(id) ON DELETE CASCADE,

    secret_encrypted TEXT NOT NULL,

    enabled BOOLEAN NOT NULL DEFAULT FALSE,

    enabled_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- RECOVERY CODES
-- =========================================================

CREATE TABLE user_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    code_hash TEXT NOT NULL,

    used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, code_hash)
);


-- =========================================================
-- USER TOKENS
-- =========================================================

CREATE TABLE user_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(30) NOT NULL
        CHECK (
            type IN (
                'EMAIL_VERIFICATION',
                'PASSWORD_RESET'
            )
        ),

    token_hash TEXT NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_tokens_lookup_idx
ON user_tokens (user_id, type, expires_at);


-- =========================================================
-- ORGANIZATION MEMBERSHIPS
-- =========================================================

CREATE TABLE organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    role VARCHAR(20) NOT NULL
        CHECK (
            role IN (
                'OWNER',
                'ADMIN',
                'MANAGER',
                'EMPLOYEE',
                'CLIENT'
            )
        ),

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (
            status IN (
                'ACTIVE',
                'INVITED',
                'SUSPENDED'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (organization_id, user_id)
);


-- =========================================================
-- EMPLOYEES
-- =========================================================

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,

    user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(150) NOT NULL,

    email VARCHAR(320),
    phone VARCHAR(32),

    color VARCHAR(7),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    archived_at TIMESTAMPTZ,

    UNIQUE (id, organization_id),
    UNIQUE (organization_id, user_id)
);


-- =========================================================
-- SERVICE CATEGORIES
-- =========================================================

CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,

    sort_order INTEGER NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (id, organization_id)
);


-- =========================================================
-- SERVICES
-- =========================================================

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,

    category_id UUID,

    name VARCHAR(150) NOT NULL,
    description TEXT,

    price NUMERIC(10,2)
        CHECK (price IS NULL OR price >= 0),

    duration_minutes INTEGER NOT NULL
        CHECK (duration_minutes > 0),

    buffer_before_minutes INTEGER NOT NULL DEFAULT 0
        CHECK (buffer_before_minutes >= 0),

    buffer_after_minutes INTEGER NOT NULL DEFAULT 0
        CHECK (buffer_after_minutes >= 0),

    minimum_booking_notice_minutes INTEGER
        CHECK (
            minimum_booking_notice_minutes IS NULL
            OR minimum_booking_notice_minutes >= 0
        ),

    maximum_booking_advance_days INTEGER
        CHECK (
            maximum_booking_advance_days IS NULL
            OR maximum_booking_advance_days > 0
        ),

    same_day_booking BOOLEAN,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    archived_at TIMESTAMPTZ,

    UNIQUE (id, organization_id),

    FOREIGN KEY (category_id, organization_id)
        REFERENCES service_categories(id, organization_id)
        ON DELETE SET NULL
);


-- =========================================================
-- EMPLOYEE SERVICES
-- =========================================================

CREATE TABLE employee_services (
    organization_id UUID NOT NULL,

    employee_id UUID NOT NULL,
    service_id UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (employee_id, service_id),

    FOREIGN KEY (employee_id, organization_id)
        REFERENCES employees(id, organization_id)
        ON DELETE CASCADE,

    FOREIGN KEY (service_id, organization_id)
        REFERENCES services(id, organization_id)
        ON DELETE CASCADE
);


-- =========================================================
-- LOYALTY LEVELS
-- =========================================================

CREATE TABLE loyalty_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(80) NOT NULL,

    minimum_points INTEGER NOT NULL
        CHECK (minimum_points >= 0),

    sort_order INTEGER NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (id, organization_id)
);


-- =========================================================
-- CUSTOMERS
-- =========================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,

    user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,

    loyalty_level_id UUID,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(150),

    email VARCHAR(320) NOT NULL,
    phone VARCHAR(32) NOT NULL,

    notes TEXT,

    points_balance INTEGER NOT NULL DEFAULT 0
        CHECK (points_balance >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    anonymized_at TIMESTAMPTZ,

    UNIQUE (id, organization_id),
    UNIQUE (organization_id, user_id),

    FOREIGN KEY (loyalty_level_id, organization_id)
        REFERENCES loyalty_levels(id, organization_id)
        ON DELETE SET NULL
);


-- =========================================================
-- EMPLOYEE WORKING HOURS
-- =========================================================

CREATE TABLE employee_working_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,

    day_of_week SMALLINT NOT NULL
        CHECK (day_of_week BETWEEN 0 AND 6),

    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    valid_from DATE,
    valid_to DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (start_time < end_time),

    CHECK (
        valid_to IS NULL
        OR valid_from IS NULL
        OR valid_to >= valid_from
    ),

    FOREIGN KEY (employee_id, organization_id)
        REFERENCES employees(id, organization_id)
        ON DELETE CASCADE
);


-- =========================================================
-- CALENDAR BLOCKS
-- =========================================================

CREATE TABLE calendar_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,

    employee_id UUID,

    type VARCHAR(30) NOT NULL
        CHECK (
            type IN (
                'BREAK',
                'MEETING',
                'VACATION',
                'ABSENCE',
                'PERSONAL',
                'HOLIDAY',
                'MANUAL_BLOCK',
                'OTHER'
            )
        ),

    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,

    reason VARCHAR(255),

    created_by_user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (start_at < end_at),

    FOREIGN KEY (employee_id, organization_id)
        REFERENCES employees(id, organization_id)
        ON DELETE CASCADE
);


-- =========================================================
-- APPOINTMENTS
-- =========================================================

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,

    reference_code VARCHAR(20) NOT NULL,

    customer_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    service_id UUID NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'CONFIRMED',
                'COMPLETED',
                'CANCELLED',
                'NO_SHOW'
            )
        ),

    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,

    occupied_start_at TIMESTAMPTZ NOT NULL,
    occupied_end_at TIMESTAMPTZ NOT NULL,

    duration_minutes INTEGER NOT NULL
        CHECK (duration_minutes > 0),

    buffer_before_minutes INTEGER NOT NULL DEFAULT 0
        CHECK (buffer_before_minutes >= 0),

    buffer_after_minutes INTEGER NOT NULL DEFAULT 0
        CHECK (buffer_after_minutes >= 0),

    price_amount NUMERIC(10,2)
        CHECK (price_amount IS NULL OR price_amount >= 0),

    currency_code CHAR(3) NOT NULL DEFAULT 'EUR',

    customer_notes TEXT,
    internal_notes TEXT,

    created_by_user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,

    cancellation_actor VARCHAR(20)
        CHECK (
            cancellation_actor IS NULL
            OR cancellation_actor IN (
                'CLIENT',
                'EMPLOYEE',
                'ADMIN',
                'SYSTEM'
            )
        ),

    cancellation_reason TEXT,

    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (start_at < end_at),

    CHECK (occupied_start_at <= start_at),

    CHECK (occupied_end_at >= end_at),

    UNIQUE (organization_id, reference_code),
    UNIQUE (id, organization_id),

    FOREIGN KEY (customer_id, organization_id)
        REFERENCES customers(id, organization_id),

    FOREIGN KEY (employee_id, organization_id)
        REFERENCES employees(id, organization_id),

    FOREIGN KEY (service_id, organization_id)
        REFERENCES services(id, organization_id)
);


-- =========================================================
-- EVITAR DOBLE RESERVA
-- =========================================================

ALTER TABLE appointments
ADD CONSTRAINT appointments_no_employee_overlap
EXCLUDE USING gist (
    organization_id WITH =,
    employee_id WITH =,
    tstzrange(
        occupied_start_at,
        occupied_end_at,
        '[)'
    ) WITH &&
)
WHERE (
    status IN ('PENDING', 'CONFIRMED')
);


-- =========================================================
-- APPOINTMENT ACCESS TOKENS
-- =========================================================

CREATE TABLE appointment_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    appointment_id UUID NOT NULL
        REFERENCES appointments(id) ON DELETE CASCADE,

    token_hash TEXT NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- LOYALTY TRANSACTIONS
-- =========================================================

CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,

    customer_id UUID NOT NULL,

    appointment_id UUID,

    points INTEGER NOT NULL,

    type VARCHAR(30) NOT NULL,

    reason VARCHAR(255),

    created_by_user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (customer_id, organization_id)
        REFERENCES customers(id, organization_id),

    FOREIGN KEY (appointment_id, organization_id)
        REFERENCES appointments(id, organization_id)
);


-- =========================================================
-- PLANS
-- =========================================================

CREATE TABLE plans (
    code VARCHAR(30) PRIMARY KEY,

    name VARCHAR(80) NOT NULL,

    max_employees INTEGER
        CHECK (max_employees IS NULL OR max_employees > 0),

    max_locations INTEGER
        CHECK (max_locations IS NULL OR max_locations > 0),

    max_monthly_appointments INTEGER
        CHECK (
            max_monthly_appointments IS NULL
            OR max_monthly_appointments > 0
        ),

    can_use_loyalty BOOLEAN NOT NULL DEFAULT FALSE,
    can_use_advanced_reports BOOLEAN NOT NULL DEFAULT FALSE,
    can_use_multiple_locations BOOLEAN NOT NULL DEFAULT FALSE,
    can_use_sms BOOLEAN NOT NULL DEFAULT FALSE,

    trial_days INTEGER NOT NULL DEFAULT 0
        CHECK (trial_days >= 0),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- ORGANIZATION SUBSCRIPTIONS
-- =========================================================

CREATE TABLE organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,

    plan_code VARCHAR(30) NOT NULL
        REFERENCES plans(code),

    status VARCHAR(20) NOT NULL
        CHECK (
            status IN (
                'TRIAL',
                'ACTIVE',
                'EXPIRED',
                'SUSPENDED'
            )
        ),

    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,

    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX organization_subscriptions_one_current
ON organization_subscriptions (organization_id)
WHERE status IN ('TRIAL', 'ACTIVE', 'SUSPENDED');


-- =========================================================
-- NOTIFICATIONS
-- =========================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,

    appointment_id UUID,
    customer_id UUID,

    user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,

    channel VARCHAR(20) NOT NULL
        CHECK (
            channel IN (
                'EMAIL',
                'SMS',
                'IN_APP'
            )
        ),

    type VARCHAR(50) NOT NULL,

    destination VARCHAR(320) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'SENT',
                'FAILED',
                'CANCELLED'
            )
        ),

    provider_message_id TEXT,
    error_message TEXT,

    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (appointment_id, organization_id)
        REFERENCES appointments(id, organization_id),

    FOREIGN KEY (customer_id, organization_id)
        REFERENCES customers(id, organization_id)
);


-- =========================================================
-- AUDIT LOGS
-- =========================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES organizations(id) ON DELETE SET NULL,

    actor_user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,

    entity_type VARCHAR(50) NOT NULL,

    entity_id UUID,

    old_values JSONB,
    new_values JSONB,

    request_id VARCHAR(100),

    ip_address INET,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX organization_memberships_user_idx
ON organization_memberships (user_id, organization_id);

CREATE INDEX employees_organization_active_idx
ON employees (organization_id, is_active);

CREATE INDEX services_organization_active_idx
ON services (organization_id, is_active);

CREATE INDEX customers_organization_email_idx
ON customers (organization_id, email);

CREATE INDEX employee_working_hours_employee_day_idx
ON employee_working_hours (employee_id, day_of_week);

CREATE INDEX calendar_blocks_employee_dates_idx
ON calendar_blocks (employee_id, start_at, end_at);

CREATE INDEX calendar_blocks_organization_dates_idx
ON calendar_blocks (organization_id, start_at, end_at);

CREATE INDEX appointments_organization_start_idx
ON appointments (organization_id, start_at);

CREATE INDEX appointments_employee_start_idx
ON appointments (employee_id, start_at);

CREATE INDEX appointments_customer_start_idx
ON appointments (customer_id, start_at);

CREATE INDEX appointments_organization_status_idx
ON appointments (organization_id, status);

CREATE INDEX loyalty_transactions_customer_idx
ON loyalty_transactions (customer_id, created_at);

CREATE INDEX notifications_status_schedule_idx
ON notifications (status, scheduled_at);

CREATE INDEX audit_logs_organization_created_idx
ON audit_logs (organization_id, created_at DESC);


-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================

CREATE TRIGGER organizations_set_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER organization_settings_set_updated_at
BEFORE UPDATE ON organization_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER organization_memberships_set_updated_at
BEFORE UPDATE ON organization_memberships
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER employees_set_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER service_categories_set_updated_at
BEFORE UPDATE ON service_categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER services_set_updated_at
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER loyalty_levels_set_updated_at
BEFORE UPDATE ON loyalty_levels
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER customers_set_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER employee_working_hours_set_updated_at
BEFORE UPDATE ON employee_working_hours
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER calendar_blocks_set_updated_at
BEFORE UPDATE ON calendar_blocks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER appointments_set_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER plans_set_updated_at
BEFORE UPDATE ON plans
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER organization_subscriptions_set_updated_at
BEFORE UPDATE ON organization_subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER notifications_set_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =========================================================
-- ROLLBACK
-- =========================================================


-- migrate:down

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS organization_subscriptions;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS loyalty_transactions;
DROP TABLE IF EXISTS appointment_access_tokens;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS calendar_blocks;
DROP TABLE IF EXISTS employee_working_hours;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS loyalty_levels;
DROP TABLE IF EXISTS employee_services;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS service_categories;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS organization_memberships;
DROP TABLE IF EXISTS user_tokens;
DROP TABLE IF EXISTS user_recovery_codes;
DROP TABLE IF EXISTS user_two_factor;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organization_settings;
DROP TABLE IF EXISTS organization_locales;
DROP TABLE IF EXISTS organizations;

DROP FUNCTION IF EXISTS set_updated_at();

DROP EXTENSION IF EXISTS btree_gist;
DROP EXTENSION IF EXISTS pgcrypto;