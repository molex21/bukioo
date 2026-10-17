-- migrate:up
ALTER TABLE services
  ADD COLUMN price_type TEXT NOT NULL DEFAULT 'FIXED',
  ADD CONSTRAINT services_price_type_check
    CHECK (price_type IN ('FIXED', 'FROM'));

-- migrate:down
ALTER TABLE services
  DROP CONSTRAINT services_price_type_check,
  DROP COLUMN price_type;
