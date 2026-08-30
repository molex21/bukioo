import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { ListNotificationsDto } from "./dto/list-notifications.dto";
import { UpdateNotificationSettingsDto } from "./dto/update-notification-settings.dto";

export interface NotificationRecord {
  id: string;
  channel: string;
  type: string;
  destination: string;
  status: string;
  appointment_id: string | null;
  appointment_reference_code: string | null;
  customer_id: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  scheduled_at: Date | null;
  sent_at: Date | null;
  error_message: string | null;
  created_at: Date;
}

export interface NotificationSettingsRecord {
  business_id: string;
  organization_id: string;
  appointment_reminder_enabled: boolean;
  appointment_reminder_hours_before: number;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async canManageBusiness(
    userId: string,
    businessId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM businesses
        INNER JOIN organization_memberships
          ON organization_memberships.organization_id = businesses.organization_id
        INNER JOIN users ON users.id = organization_memberships.user_id
        WHERE businesses.id = $1
          AND businesses.status = 'ACTIVE'
          AND organization_memberships.user_id = $2
          AND organization_memberships.status = 'ACTIVE'
          AND organization_memberships.role IN ('OWNER', 'ADMIN')
          AND users.status = 'ACTIVE'
      ) AS exists`,
      [businessId, userId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async canAccessBusiness(
    userId: string,
    businessId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM businesses
        INNER JOIN organization_memberships
          ON organization_memberships.organization_id = businesses.organization_id
        INNER JOIN users ON users.id = organization_memberships.user_id
        WHERE businesses.id = $1
          AND businesses.status = 'ACTIVE'
          AND organization_memberships.user_id = $2
          AND organization_memberships.status = 'ACTIVE'
          AND users.status = 'ACTIVE'
          AND (
            organization_memberships.role IN ('OWNER', 'ADMIN')
            OR EXISTS (
              SELECT 1 FROM business_memberships
              WHERE business_memberships.business_id = businesses.id
                AND business_memberships.organization_id = businesses.organization_id
                AND business_memberships.user_id = $2
            )
          )
      ) AS exists`,
      [businessId, userId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async findSettingsByBusiness(
    businessId: string,
  ): Promise<NotificationSettingsRecord | null> {
    const result = await this.databaseService.query<NotificationSettingsRecord>(
      `SELECT business_id, organization_id, appointment_reminder_enabled,
        appointment_reminder_hours_before
      FROM business_notification_settings
      WHERE business_id = $1
      LIMIT 1`,
      [businessId],
    );
    return result.rows[0] ?? null;
  }

  async updateSettings(
    settings: NotificationSettingsRecord,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsRecord> {
    const result = await this.databaseService.query<NotificationSettingsRecord>(
      `UPDATE business_notification_settings
      SET appointment_reminder_enabled = COALESCE(
            $1,
            appointment_reminder_enabled
          ),
          appointment_reminder_hours_before = COALESCE(
            $2,
            appointment_reminder_hours_before
          )
      WHERE business_id = $3 AND organization_id = $4
      RETURNING business_id, organization_id, appointment_reminder_enabled,
        appointment_reminder_hours_before`,
      [
        dto.appointmentReminderEnabled,
        dto.appointmentReminderHoursBefore,
        settings.business_id,
        settings.organization_id,
      ],
    );
    return result.rows[0];
  }

  async listByBusiness(
    businessId: string,
    filters: ListNotificationsDto,
  ): Promise<NotificationRecord[]> {
    const result = await this.databaseService.query<NotificationRecord>(
      `SELECT notifications.id, notifications.channel, notifications.type,
        notifications.destination, notifications.status,
        notifications.appointment_id,
        appointments.reference_code AS appointment_reference_code,
        notifications.customer_id, customers.first_name AS customer_first_name,
        customers.last_name AS customer_last_name, notifications.scheduled_at,
        notifications.sent_at, notifications.error_message, notifications.created_at
      FROM notifications
      LEFT JOIN appointments ON appointments.id = notifications.appointment_id
        AND appointments.organization_id = notifications.organization_id
      LEFT JOIN customers ON customers.id = notifications.customer_id
        AND customers.organization_id = notifications.organization_id
      WHERE COALESCE(appointments.business_id, customers.business_id) = $1
        AND ($2::varchar IS NULL OR notifications.status = $2::varchar)
        AND ($3::varchar IS NULL OR notifications.channel = $3::varchar)
        AND ($4::varchar IS NULL OR notifications.type = $4::varchar)
        AND ($5::uuid IS NULL OR notifications.appointment_id = $5::uuid)
        AND ($6::uuid IS NULL OR notifications.customer_id = $6::uuid)
        AND ($7::timestamptz IS NULL OR notifications.created_at >= $7::timestamptz)
        AND ($8::timestamptz IS NULL OR notifications.created_at < $8::timestamptz)
      ORDER BY notifications.created_at DESC, notifications.id DESC
      LIMIT $9 OFFSET $10`,
      [
        businessId,
        filters.status ?? null,
        filters.channel ?? null,
        filters.type ?? null,
        filters.appointmentId ?? null,
        filters.customerId ?? null,
        filters.from ?? null,
        filters.to ?? null,
        filters.limit ?? 50,
        filters.offset ?? 0,
      ],
    );
    return result.rows;
  }
}
