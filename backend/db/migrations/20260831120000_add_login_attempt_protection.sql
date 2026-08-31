-- migrate:up

CREATE TABLE user_login_attempts (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
    last_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ
);

CREATE INDEX user_login_attempts_locked_until_idx
    ON user_login_attempts (locked_until)
    WHERE locked_until IS NOT NULL;

CREATE TABLE customer_account_login_attempts (
    customer_account_id UUID PRIMARY KEY
        REFERENCES customer_accounts(id) ON DELETE CASCADE,
    failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
    last_failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ
);

CREATE INDEX customer_account_login_attempts_locked_until_idx
    ON customer_account_login_attempts (locked_until)
    WHERE locked_until IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS customer_account_login_attempts_locked_until_idx;
DROP TABLE IF EXISTS customer_account_login_attempts;
DROP INDEX IF EXISTS user_login_attempts_locked_until_idx;
DROP TABLE IF EXISTS user_login_attempts;
