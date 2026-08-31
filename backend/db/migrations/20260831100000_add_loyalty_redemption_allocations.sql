-- migrate:up

CREATE TABLE loyalty_redemption_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    redemption_transaction_id UUID NOT NULL
        REFERENCES loyalty_transactions(id) ON DELETE CASCADE,
    source_transaction_id UUID NOT NULL
        REFERENCES loyalty_transactions(id) ON DELETE RESTRICT,
    points INTEGER NOT NULL CHECK (points > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (redemption_transaction_id, source_transaction_id),

    FOREIGN KEY (business_id, organization_id)
        REFERENCES businesses(id, organization_id),
    FOREIGN KEY (customer_id, organization_id)
        REFERENCES customers(id, organization_id)
);

CREATE INDEX loyalty_redemption_allocations_source_idx
    ON loyalty_redemption_allocations (source_transaction_id);

CREATE INDEX loyalty_redemption_allocations_customer_idx
    ON loyalty_redemption_allocations (customer_id, business_id);

-- migrate:down

DROP TABLE IF EXISTS loyalty_redemption_allocations;
