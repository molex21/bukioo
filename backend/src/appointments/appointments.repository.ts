import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { CreateAppointmentDto } from "./dto/create-appointment.dto";
import type { ListAppointmentsDto } from "./dto/list-appointments.dto";
import type { UpdateAppointmentDto } from "./dto/update-appointment.dto";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface AppointmentRecord {
  id: string;
  organization_id: string;
  business_id: string;
  reference_code: string;
  customer_id: string;
  employee_id: string;
  service_id: string;
  status: AppointmentStatus;
  start_at: Date;
  end_at: Date;
  occupied_start_at: Date;
  occupied_end_at: Date;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  price_amount: string | null;
  currency_code: string;
  customer_notes: string | null;
  internal_notes: string | null;
  created_by_user_id: string | null;
  cancellation_actor: string | null;
  cancellation_reason: string | null;
  cancelled_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface BookingContext {
  organization_id: string;
  business_id: string;
  timezone: string;
  currency_code: string;
  customer_id: string;
  employee_id: string;
  service_id: string;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  price: string | null;
}

@Injectable()
export class AppointmentsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async canAccessBusiness(
    userId: string,
    businessId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM businesses
        INNER JOIN organization_memberships ON organization_memberships.organization_id = businesses.organization_id
        INNER JOIN users ON users.id = organization_memberships.user_id
        WHERE businesses.id = $1 AND businesses.status = 'ACTIVE' AND organization_memberships.user_id = $2
          AND organization_memberships.status = 'ACTIVE' AND users.status = 'ACTIVE'
          AND (organization_memberships.role IN ('OWNER', 'ADMIN') OR EXISTS (
            SELECT 1 FROM business_memberships WHERE business_memberships.business_id = businesses.id
              AND business_memberships.user_id = $2 AND business_memberships.organization_id = businesses.organization_id))) AS exists`,
      [businessId, userId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async canManageBusiness(
    userId: string,
    businessId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM businesses
        INNER JOIN organization_memberships ON organization_memberships.organization_id = businesses.organization_id
        INNER JOIN users ON users.id = organization_memberships.user_id
        WHERE businesses.id = $1 AND businesses.status = 'ACTIVE' AND organization_memberships.user_id = $2
          AND organization_memberships.status = 'ACTIVE' AND organization_memberships.role IN ('OWNER', 'ADMIN')
          AND users.status = 'ACTIVE') AS exists`,
      [businessId, userId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async findBookingContext(
    businessId: string,
    customerId: string,
    employeeId: string,
    serviceId: string,
  ): Promise<BookingContext | null> {
    const result = await this.databaseService.query<BookingContext>(
      `SELECT businesses.organization_id, businesses.id AS business_id, businesses.timezone,
        organizations.currency_code, customers.id AS customer_id, employees.id AS employee_id,
        services.id AS service_id, services.duration_minutes, services.buffer_before_minutes,
        services.buffer_after_minutes, services.price
      FROM businesses
      INNER JOIN organizations ON organizations.id = businesses.organization_id
      INNER JOIN customers ON customers.id = $2 AND customers.business_id = businesses.id
        AND customers.organization_id = businesses.organization_id AND customers.anonymized_at IS NULL
      INNER JOIN employees ON employees.id = $3 AND employees.business_id = businesses.id
        AND employees.organization_id = businesses.organization_id AND employees.is_active = TRUE
      INNER JOIN services ON services.id = $4 AND services.business_id = businesses.id
        AND services.organization_id = businesses.organization_id AND services.is_active = TRUE
        AND services.archived_at IS NULL
      INNER JOIN employee_services ON employee_services.employee_id = employees.id
        AND employee_services.service_id = services.id AND employee_services.business_id = businesses.id
        AND employee_services.organization_id = businesses.organization_id
      WHERE businesses.id = $1 AND businesses.status = 'ACTIVE' LIMIT 1`,
      [businessId, customerId, employeeId, serviceId],
    );
    return result.rows[0] ?? null;
  }

  async isWithinWorkingHours(
    context: BookingContext,
    occupiedStartAt: Date,
    occupiedEndAt: Date,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM employee_working_hours
        WHERE employee_id = $1 AND business_id = $2 AND organization_id = $3
          AND day_of_week = EXTRACT(DOW FROM $4::timestamptz AT TIME ZONE $6)::smallint
          AND start_time <= ($4::timestamptz AT TIME ZONE $6)::time
          AND end_time >= ($5::timestamptz AT TIME ZONE $6)::time
          AND ($4::timestamptz AT TIME ZONE $6)::date = ($5::timestamptz AT TIME ZONE $6)::date
          AND (valid_from IS NULL OR valid_from <= ($4::timestamptz AT TIME ZONE $6)::date)
          AND (valid_to IS NULL OR valid_to >= ($4::timestamptz AT TIME ZONE $6)::date)) AS exists`,
      [
        context.employee_id,
        context.business_id,
        context.organization_id,
        occupiedStartAt,
        occupiedEndAt,
        context.timezone,
      ],
    );
    return result.rows[0]?.exists ?? false;
  }

  async hasCalendarBlock(
    context: BookingContext,
    occupiedStartAt: Date,
    occupiedEndAt: Date,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM calendar_blocks
        WHERE business_id = $1 AND organization_id = $2
          AND (employee_id = $3 OR employee_id IS NULL)
          AND start_at < $5 AND end_at > $4) AS exists`,
      [
        context.business_id,
        context.organization_id,
        context.employee_id,
        occupiedStartAt,
        occupiedEndAt,
      ],
    );
    return result.rows[0]?.exists ?? false;
  }

  async hasAppointmentOverlap(
    context: BookingContext,
    occupiedStartAt: Date,
    occupiedEndAt: Date,
    excludingAppointmentId?: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM appointments
        WHERE business_id = $1 AND organization_id = $2 AND employee_id = $3
          AND status IN ('PENDING', 'CONFIRMED') AND occupied_start_at < $5 AND occupied_end_at > $4
          AND ($6::uuid IS NULL OR id <> $6::uuid)) AS exists`,
      [
        context.business_id,
        context.organization_id,
        context.employee_id,
        occupiedStartAt,
        occupiedEndAt,
        excludingAppointmentId ?? null,
      ],
    );
    return result.rows[0]?.exists ?? false;
  }

  async create(
    context: BookingContext,
    dto: CreateAppointmentDto,
    startAt: Date,
    endAt: Date,
    occupiedStartAt: Date,
    occupiedEndAt: Date,
    referenceCode: string,
    userId: string,
  ): Promise<AppointmentRecord> {
    const result = await this.databaseService.query<AppointmentRecord>(
      `INSERT INTO appointments (organization_id, business_id, reference_code, customer_id, employee_id,
        service_id, start_at, end_at, occupied_start_at, occupied_end_at, duration_minutes,
        buffer_before_minutes, buffer_after_minutes, price_amount, currency_code, customer_notes,
        internal_notes, created_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        context.organization_id,
        context.business_id,
        referenceCode,
        context.customer_id,
        context.employee_id,
        context.service_id,
        startAt,
        endAt,
        occupiedStartAt,
        occupiedEndAt,
        context.duration_minutes,
        context.buffer_before_minutes,
        context.buffer_after_minutes,
        context.price,
        context.currency_code,
        dto.customerNotes ?? null,
        dto.internalNotes ?? null,
        userId,
      ],
    );
    return result.rows[0];
  }

  async listByBusiness(
    businessId: string,
    filters: ListAppointmentsDto,
  ): Promise<AppointmentRecord[]> {
    const result = await this.databaseService.query<AppointmentRecord>(
      `SELECT * FROM appointments WHERE business_id = $1
        AND ($2::timestamptz IS NULL OR end_at > $2::timestamptz)
        AND ($3::timestamptz IS NULL OR start_at < $3::timestamptz)
        AND ($4::uuid IS NULL OR employee_id = $4::uuid)
        AND ($5::uuid IS NULL OR customer_id = $5::uuid)
        AND ($6::varchar IS NULL OR status = $6::varchar)
      ORDER BY start_at ASC`,
      [
        businessId,
        filters.from ?? null,
        filters.to ?? null,
        filters.employeeId ?? null,
        filters.customerId ?? null,
        filters.status ?? null,
      ],
    );
    return result.rows;
  }

  async findById(
    businessId: string,
    appointmentId: string,
  ): Promise<AppointmentRecord | null> {
    const result = await this.databaseService.query<AppointmentRecord>(
      `SELECT * FROM appointments WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [appointmentId, businessId],
    );
    return result.rows[0] ?? null;
  }

  async update(
    appointment: AppointmentRecord,
    context: BookingContext,
    dto: UpdateAppointmentDto,
    startAt: Date,
    endAt: Date,
    occupiedStartAt: Date,
    occupiedEndAt: Date,
    replaceSnapshot: boolean,
  ): Promise<AppointmentRecord> {
    const result = await this.databaseService.query<AppointmentRecord>(
      `UPDATE appointments SET customer_id = $1, employee_id = $2, service_id = $3, start_at = $4,
        end_at = $5, occupied_start_at = $6, occupied_end_at = $7,
        duration_minutes = CASE WHEN $8 THEN $9 ELSE duration_minutes END,
        buffer_before_minutes = CASE WHEN $8 THEN $10 ELSE buffer_before_minutes END,
        buffer_after_minutes = CASE WHEN $8 THEN $11 ELSE buffer_after_minutes END,
        price_amount = CASE WHEN $8 THEN $12 ELSE price_amount END,
        currency_code = CASE WHEN $8 THEN $13 ELSE currency_code END,
        customer_notes = COALESCE($14, customer_notes), internal_notes = COALESCE($15, internal_notes), updated_at = NOW()
      WHERE id = $16 AND business_id = $17 AND organization_id = $18 AND status IN ('PENDING', 'CONFIRMED')
      RETURNING *`,
      [
        context.customer_id,
        context.employee_id,
        context.service_id,
        startAt,
        endAt,
        occupiedStartAt,
        occupiedEndAt,
        replaceSnapshot,
        context.duration_minutes,
        context.buffer_before_minutes,
        context.buffer_after_minutes,
        context.price,
        context.currency_code,
        dto.customerNotes,
        dto.internalNotes,
        appointment.id,
        appointment.business_id,
        appointment.organization_id,
      ],
    );
    return result.rows[0];
  }

  async setStatus(
    appointment: AppointmentRecord,
    status: AppointmentStatus,
    reason?: string,
  ): Promise<AppointmentRecord | null> {
    const result = await this.databaseService.query<AppointmentRecord>(
      `UPDATE appointments SET status = $1, cancellation_actor = CASE WHEN $1 = 'CANCELLED' THEN 'ADMIN' ELSE NULL END,
        cancellation_reason = CASE WHEN $1 = 'CANCELLED' THEN $2 ELSE NULL END,
        cancelled_at = CASE WHEN $1 = 'CANCELLED' THEN NOW() ELSE NULL END,
        completed_at = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE NULL END,
        updated_at = NOW()
      WHERE id = $3 AND business_id = $4 AND organization_id = $5 AND status IN ('PENDING', 'CONFIRMED')
      RETURNING *`,
      [
        status,
        reason ?? null,
        appointment.id,
        appointment.business_id,
        appointment.organization_id,
      ],
    );
    return result.rows[0] ?? null;
  }
}
