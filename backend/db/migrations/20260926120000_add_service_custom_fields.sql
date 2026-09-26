-- migrate:up
ALTER TABLE services
  ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT services_custom_fields_array_check
    CHECK (jsonb_typeof(custom_fields) = 'array');

-- migrate:down
ALTER TABLE services
  DROP CONSTRAINT services_custom_fields_array_check,
  DROP COLUMN custom_fields;
