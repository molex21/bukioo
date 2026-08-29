-- migrate:up
ALTER TABLE notifications
    ADD COLUMN loyalty_transaction_id UUID
        REFERENCES loyalty_transactions(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX notifications_loyalty_expiration_unique
    ON notifications (loyalty_transaction_id, type)
    WHERE type IN (
        'LOYALTY_POINTS_EXPIRING_30_DAYS',
        'LOYALTY_POINTS_EXPIRING_7_DAYS'
    );

-- migrate:down
DROP INDEX IF EXISTS notifications_loyalty_expiration_unique;

ALTER TABLE notifications
    DROP COLUMN loyalty_transaction_id;
