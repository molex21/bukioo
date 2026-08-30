-- migrate:up
CREATE TABLE business_notification_settings (
    business_id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    appointment_reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    appointment_reminder_hours_before INTEGER NOT NULL DEFAULT 24
        CHECK (appointment_reminder_hours_before BETWEEN 1 AND 168),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (business_id, organization_id)
        REFERENCES businesses(id, organization_id) ON DELETE CASCADE
);

INSERT INTO business_notification_settings (business_id, organization_id)
SELECT id, organization_id FROM businesses;

CREATE TRIGGER business_notification_settings_set_updated_at
BEFORE UPDATE ON business_notification_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

UPDATE notifications
SET type = 'APPOINTMENT_REMINDER'
WHERE type = 'APPOINTMENT_REMINDER_24_HOURS';

DROP INDEX IF EXISTS notifications_appointment_reminder_unique;

CREATE UNIQUE INDEX notifications_appointment_reminder_unique
    ON notifications (appointment_id, type, appointment_reminder_start_at)
    WHERE type = 'APPOINTMENT_REMINDER';

-- migrate:down
DROP INDEX IF EXISTS notifications_appointment_reminder_unique;

UPDATE notifications
SET type = 'APPOINTMENT_REMINDER_24_HOURS'
WHERE type = 'APPOINTMENT_REMINDER';

CREATE UNIQUE INDEX notifications_appointment_reminder_unique
    ON notifications (appointment_id, type, appointment_reminder_start_at)
    WHERE type = 'APPOINTMENT_REMINDER_24_HOURS';

DROP TRIGGER IF EXISTS business_notification_settings_set_updated_at
    ON business_notification_settings;
DROP TABLE IF EXISTS business_notification_settings;
