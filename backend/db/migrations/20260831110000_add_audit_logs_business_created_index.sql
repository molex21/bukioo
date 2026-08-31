-- migrate:up

CREATE INDEX audit_logs_business_created_idx
    ON audit_logs (business_id, created_at DESC);

-- migrate:down

DROP INDEX IF EXISTS audit_logs_business_created_idx;
