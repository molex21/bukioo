-- migrate:up

ALTER TABLE user_tokens
  ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN attempts SMALLINT NOT NULL DEFAULT 0;

CREATE INDEX user_tokens_active_email_change_idx
  ON user_tokens (user_id, expires_at)
  WHERE type = 'EMAIL_CHANGE' AND used_at IS NULL;

-- migrate:down

DROP INDEX IF EXISTS user_tokens_active_email_change_idx;

ALTER TABLE user_tokens
  DROP COLUMN attempts,
  DROP COLUMN metadata;
