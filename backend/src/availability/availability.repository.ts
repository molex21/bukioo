import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface AvailabilityContext {
  organization_id: string;
  business_id: string;
  employee_id: string;
  service_id: string;
  timezone: string;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  minimum_booking_notice_minutes: number;
  maximum_booking_advance_days: number;
  same_day_booking: boolean;
  slot_interval_minutes: number;
}

export interface AvailableSlot {
  startAt: Date;
  endAt: Date;
}

@Injectable()
export class AvailabilityRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async canAccessBusiness(
    userId: string,
    businessId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM businesses
        INNER JOIN organization_memberships
          ON organization_memberships.organization_id = businesses.organization_id
        INNER JOIN users ON users.id = organization_memberships.user_id
        WHERE businesses.id = $1 AND businesses.status = 'ACTIVE'
          AND organization_memberships.user_id = $2
          AND organization_memberships.status = 'ACTIVE' AND users.status = 'ACTIVE'
          AND (organization_memberships.role IN ('OWNER', 'ADMIN') OR EXISTS (
            SELECT 1 FROM business_memberships
            WHERE business_memberships.business_id = businesses.id
              AND business_memberships.user_id = $2
              AND business_memberships.organization_id = businesses.organization_id
          ))
      ) AS exists`,
      [businessId, userId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async findContext(
    businessId: string,
    employeeId: string,
    serviceId: string,
  ): Promise<AvailabilityContext | null> {
    const result = await this.databaseService.query<AvailabilityContext>(
      `SELECT businesses.organization_id, businesses.id AS business_id,
        employees.id AS employee_id, services.id AS service_id, businesses.timezone,
        services.duration_minutes, services.buffer_before_minutes,
        services.buffer_after_minutes,
        COALESCE(services.minimum_booking_notice_minutes,
          organization_settings.minimum_booking_notice_minutes)
          AS minimum_booking_notice_minutes,
        COALESCE(services.maximum_booking_advance_days,
          organization_settings.maximum_booking_advance_days)
          AS maximum_booking_advance_days,
        COALESCE(services.same_day_booking, organization_settings.same_day_booking)
          AS same_day_booking,
        organization_settings.slot_interval_minutes
      FROM businesses
      INNER JOIN organization_settings
        ON organization_settings.organization_id = businesses.organization_id
      INNER JOIN employees
        ON employees.id = $2 AND employees.business_id = businesses.id
        AND employees.organization_id = businesses.organization_id
        AND employees.is_active = TRUE AND employees.archived_at IS NULL
      INNER JOIN services
        ON services.id = $3 AND services.business_id = businesses.id
        AND services.organization_id = businesses.organization_id
        AND services.is_active = TRUE AND services.archived_at IS NULL
      INNER JOIN employee_services
        ON employee_services.employee_id = employees.id
        AND employee_services.service_id = services.id
        AND employee_services.business_id = businesses.id
        AND employee_services.organization_id = businesses.organization_id
      WHERE businesses.id = $1 AND businesses.status = 'ACTIVE'
      LIMIT 1`,
      [businessId, employeeId, serviceId],
    );
    return result.rows[0] ?? null;
  }

  async listSlots(
    context: AvailabilityContext,
    from: Date,
    to: Date,
  ): Promise<AvailableSlot[]> {
    const result = await this.databaseService.query<AvailableSlot>(
      `WITH candidate_slots AS (
        SELECT local_start, local_start AT TIME ZONE $1 AS start_at
        FROM generate_series(
          date_trunc('day', $2::timestamptz AT TIME ZONE $1),
          date_trunc('day', $3::timestamptz AT TIME ZONE $1) + INTERVAL '1 day',
          make_interval(mins => $4::integer)
        ) AS local_start
      )
      SELECT candidate_slots.start_at AS "startAt",
        candidate_slots.start_at + make_interval(mins => $5::integer) AS "endAt"
      FROM candidate_slots
      INNER JOIN employee_working_hours
        ON employee_working_hours.employee_id = $6::uuid
        AND employee_working_hours.business_id = $7::uuid
        AND employee_working_hours.organization_id = $8::uuid
        AND employee_working_hours.day_of_week = EXTRACT(DOW FROM candidate_slots.local_start)::integer
        AND (employee_working_hours.valid_from IS NULL
          OR candidate_slots.local_start::date >= employee_working_hours.valid_from)
        AND (employee_working_hours.valid_to IS NULL
          OR candidate_slots.local_start::date <= employee_working_hours.valid_to)
      WHERE candidate_slots.start_at >= $2::timestamptz
        AND candidate_slots.start_at + make_interval(mins => $5::integer) <= $3::timestamptz
        AND candidate_slots.start_at >= NOW() + make_interval(mins => $9::integer)
        AND candidate_slots.local_start::date <=
          (NOW() AT TIME ZONE $1)::date + $10::integer
        AND ($11::boolean OR candidate_slots.local_start::date > (NOW() AT TIME ZONE $1)::date)
        AND candidate_slots.start_at - make_interval(mins => $12::integer) >=
          ((candidate_slots.local_start::date + employee_working_hours.start_time) AT TIME ZONE $1)
        AND candidate_slots.start_at + make_interval(mins => $5::integer + $13::integer) <=
          ((candidate_slots.local_start::date + employee_working_hours.end_time) AT TIME ZONE $1)
        AND NOT EXISTS (
          SELECT 1 FROM appointments
          WHERE appointments.business_id = $7::uuid
            AND appointments.organization_id = $8::uuid
            AND appointments.employee_id = $6::uuid
            AND appointments.status IN ('PENDING', 'CONFIRMED')
            AND appointments.occupied_start_at <
              candidate_slots.start_at + make_interval(mins => $5::integer + $13::integer)
            AND appointments.occupied_end_at >
              candidate_slots.start_at - make_interval(mins => $12::integer)
        )
        AND NOT EXISTS (
          SELECT 1 FROM calendar_blocks
          WHERE calendar_blocks.business_id = $7::uuid
            AND calendar_blocks.organization_id = $8::uuid
            AND (calendar_blocks.employee_id = $6::uuid OR calendar_blocks.employee_id IS NULL)
            AND calendar_blocks.start_at <
              candidate_slots.start_at + make_interval(mins => $5::integer + $13::integer)
            AND calendar_blocks.end_at >
              candidate_slots.start_at - make_interval(mins => $12::integer)
        )
      ORDER BY candidate_slots.start_at ASC`,
      [
        context.timezone,
        from,
        to,
        context.slot_interval_minutes,
        context.duration_minutes,
        context.employee_id,
        context.business_id,
        context.organization_id,
        context.minimum_booking_notice_minutes,
        context.maximum_booking_advance_days,
        context.same_day_booking,
        context.buffer_before_minutes,
        context.buffer_after_minutes,
      ],
    );
    return result.rows;
  }
}
