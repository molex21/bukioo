-- migrate:up
ALTER TABLE notifications
    ADD COLUMN appointment_reminder_start_at TIMESTAMPTZ;

CREATE UNIQUE INDEX notifications_appointment_reminder_unique
    ON notifications (appointment_id, type, appointment_reminder_start_at)
    WHERE type = 'APPOINTMENT_REMINDER_24_HOURS';

-- migrate:down
DROP INDEX IF EXISTS notifications_appointment_reminder_unique;

ALTER TABLE notifications
    DROP COLUMN appointment_reminder_start_at;
