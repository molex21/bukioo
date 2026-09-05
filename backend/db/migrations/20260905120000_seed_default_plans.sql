-- migrate:up

INSERT INTO plans (
  code,
  name,
  max_employees,
  max_locations,
  max_monthly_appointments,
  can_use_loyalty,
  can_use_advanced_reports,
  can_use_multiple_locations,
  can_use_sms,
  trial_days,
  is_active
)
VALUES
  ('free', 'Gratis', 1, 1, 50, FALSE, FALSE, FALSE, FALSE, 0, TRUE),
  ('essential', 'Essential', 2, 1, 300, TRUE, FALSE, FALSE, FALSE, 14, TRUE),
  ('professional', 'Professional', 5, 1, 1500, TRUE, TRUE, FALSE, FALSE, 14, TRUE),
  ('business', 'Business', 15, 3, 5000, TRUE, TRUE, TRUE, FALSE, 14, TRUE),
  ('unlimited', 'Unlimited', NULL, NULL, NULL, TRUE, TRUE, TRUE, FALSE, 30, TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO organization_subscriptions (organization_id, plan_code, status)
SELECT organizations.id, 'free', 'ACTIVE'
FROM organizations
WHERE NOT EXISTS (
  SELECT 1
  FROM organization_subscriptions
  WHERE organization_subscriptions.organization_id = organizations.id
    AND organization_subscriptions.status IN ('TRIAL', 'ACTIVE', 'SUSPENDED')
);

-- migrate:down

SELECT 1;
