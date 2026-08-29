-- migrate:up

CREATE TABLE customer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_account_id UUID NOT NULL
        REFERENCES customer_accounts(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX customer_sessions_active_account_idx
    ON customer_sessions (customer_account_id, expires_at)
    WHERE revoked_at IS NULL;

-- migrate:down

DROP INDEX IF EXISTS customer_sessions_active_account_idx;
DROP TABLE IF EXISTS customer_sessions;
