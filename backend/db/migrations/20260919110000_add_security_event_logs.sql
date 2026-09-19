-- migrate:up

CREATE TABLE security_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE')),
  ip_address INET,
  user_agent VARCHAR(512),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX security_event_logs_created_at_idx
  ON security_event_logs (created_at DESC);
CREATE INDEX security_event_logs_user_created_at_idx
  ON security_event_logs (user_id, created_at DESC);

-- migrate:down

DROP TABLE IF EXISTS security_event_logs;
