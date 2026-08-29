-- migrate:up

ALTER TABLE loyalty_transactions
    ADD COLUMN source_transaction_id UUID
        REFERENCES loyalty_transactions(id) ON DELETE SET NULL;

ALTER TABLE appointment_loyalty_awards
    ADD COLUMN is_expired BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX loyalty_transactions_expiry_source_unique
    ON loyalty_transactions (source_transaction_id)
    WHERE type = 'EXPIRY';

CREATE INDEX loyalty_transactions_expiry_due_idx
    ON loyalty_transactions (expires_at)
    WHERE type = 'APPOINTMENT_EARNED' AND expires_at IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS loyalty_transactions_expiry_due_idx;
DROP INDEX IF EXISTS loyalty_transactions_expiry_source_unique;
ALTER TABLE appointment_loyalty_awards DROP COLUMN IF EXISTS is_expired;
ALTER TABLE loyalty_transactions DROP COLUMN IF EXISTS source_transaction_id;
