-- migrate:up

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM customers
    WHERE anonymized_at IS NULL
    GROUP BY business_id, LOWER(email)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add unique customer email index: active duplicates exist';
  END IF;
END $$;

CREATE UNIQUE INDEX customers_business_lower_email_active_unique
  ON customers (business_id, LOWER(email))
  WHERE anonymized_at IS NULL;

-- migrate:down

DROP INDEX IF EXISTS customers_business_lower_email_active_unique;
