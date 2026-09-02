-- migrate:up

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX customers_business_first_name_active_idx
    ON customers (business_id, first_name ASC, id ASC)
    WHERE anonymized_at IS NULL;

CREATE INDEX customers_active_search_trgm_idx
    ON customers
    USING GIN (
        (
            first_name || ' ' || COALESCE(last_name, '') || ' ' || email || ' ' || phone
        ) gin_trgm_ops
    )
    WHERE anonymized_at IS NULL;

-- migrate:down

DROP INDEX IF EXISTS customers_active_search_trgm_idx;
DROP INDEX IF EXISTS customers_business_first_name_active_idx;
