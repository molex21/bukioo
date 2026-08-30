import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { CreateAppointmentDto } from "./dto/create-appointment.dto";
import type { ListAppointmentsDto } from "./dto/list-appointments.dto";
import type { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import type { LoyaltyRuleSnapshot } from "../loyalty/loyalty.types";

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
  counts_toward_membership: boolean;
  loyalty_rule_snapshot: LoyaltyRuleSnapshot | null;
  requires_approval: boolean;
  conflict_override: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AppointmentWithCustomerLoyaltyRecord
  extends AppointmentRecord {
  customer_points_balance: number;
  customer_loyalty_level_id: string | null;
  customer_loyalty_level_name: string | null;
  customer_loyalty_level_minimum_points: number | null;
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
  auto_confirm_appointments: boolean;
  loyalty_earning_type:
    | "INHERIT"
    | "NONE"
    | "FIXED"
    | "AMOUNT_MULTIPLIER"
    | "BOTH";
  loyalty_fixed_points: number | null;
  loyalty_points_per_currency_unit: string | null;
}

export interface AppointmentOccupancy {
  appointments: AppointmentRecord[];
  blocks: CalendarBlockOccupancy[];
}

export interface CustomerAppointmentRecord {
  id: string;
  reference_code: string;
  status: AppointmentStatus;
  start_at: Date;
  end_at: Date;
  business_id: string;
  business_name: string;
  employee_id: string;
  employee_first_name: string;
  employee_last_name: string;
  service_id: string;
  service_name: string;
}

export interface CustomerAppointmentDetailRecord
  extends CustomerAppointmentRecord {
  service_description: string | null;
  price_amount: string | null;
  currency_code: string;
  customer_notes: string | null;
  cancellation_reason: string | null;
  cancelled_at: Date | null;
}

export interface AppointmentReminderRecord {
  id: string;
  email: string;
  business_name: string;
  reference_code: string;
  service_name: string;
  employee_first_name: string;
  employee_last_name: string;
  start_at: Date;
  timezone: string;
}

export interface CalendarBlockOccupancy {
  id: string;
  employee_id: string | null;
  type: string;
  start_at: Date;
  end_at: Date;
  reason: string | null;
}
export interface RescheduleProposalRecord {
  id: string;
  appointment_id: string;
  organization_id: string;
  business_id: string;
  employee_id: string;
  start_at: Date;
  end_at: Date;
  occupied_start_at: Date;
  occupied_end_at: Date;
  customer_id: string;
  service_id: string;
  appointment_status: AppointmentStatus;
  appointment_start_at: Date;
  reference_code: string;
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
        services.buffer_after_minutes, services.price,
        services.loyalty_earning_type, services.loyalty_fixed_points,
        services.loyalty_points_per_currency_unit,
        COALESCE(services.auto_confirm_appointments, organization_settings.auto_confirm_appointments)
          AS auto_confirm_appointments
      FROM businesses
      INNER JOIN organizations ON organizations.id = businesses.organization_id
      INNER JOIN organization_settings ON organization_settings.organization_id = businesses.organization_id
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

  async findAppointmentContext(
    appointment: AppointmentRecord,
  ): Promise<BookingContext | null> {
    const result = await this.databaseService.query<BookingContext>(
      `SELECT businesses.organization_id, businesses.id AS business_id, businesses.timezone,
        organizations.currency_code, $2::uuid AS customer_id, $3::uuid AS employee_id,
        $4::uuid AS service_id, $5::integer AS duration_minutes,
        $6::integer AS buffer_before_minutes, $7::integer AS buffer_after_minutes,
        $8::numeric AS price, FALSE AS auto_confirm_appointments
      FROM businesses INNER JOIN organizations ON organizations.id = businesses.organization_id
      WHERE businesses.id = $1 LIMIT 1`,
      [
        appointment.business_id,
        appointment.customer_id,
        appointment.employee_id,
        appointment.service_id,
        appointment.duration_minutes,
        appointment.buffer_before_minutes,
        appointment.buffer_after_minutes,
        appointment.price_amount,
      ],
    );
    return result.rows[0] ?? null;
  }

  async create(
    context: BookingContext,
    dto: CreateAppointmentDto,
    startAt: Date,
    endAt: Date,
    occupiedStartAt: Date,
    occupiedEndAt: Date,
    referenceCode: string,
    userId: string | null,
    status: Extract<AppointmentStatus, "PENDING" | "CONFIRMED">,
    requiresApproval: boolean,
    loyaltyRuleSnapshot: LoyaltyRuleSnapshot,
  ): Promise<AppointmentRecord> {
    const result = await this.databaseService.query<AppointmentRecord>(
      `INSERT INTO appointments (organization_id, business_id, reference_code, customer_id, employee_id,
        service_id, start_at, end_at, occupied_start_at, occupied_end_at, duration_minutes,
        buffer_before_minutes, buffer_after_minutes, price_amount, currency_code, customer_notes,
        internal_notes, created_by_user_id, status, requires_approval, loyalty_rule_snapshot)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
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
        status,
        requiresApproval,
        JSON.stringify(loyaltyRuleSnapshot),
      ],
    );
    return result.rows[0];
  }

  async listByBusiness(
    businessId: string,
    filters: ListAppointmentsDto,
  ): Promise<AppointmentWithCustomerLoyaltyRecord[]> {
    const result =
      await this.databaseService.query<AppointmentWithCustomerLoyaltyRecord>(
        `SELECT appointments.*, customers.points_balance AS customer_points_balance,
        loyalty_levels.id AS customer_loyalty_level_id,
        loyalty_levels.name AS customer_loyalty_level_name,
        loyalty_levels.minimum_points AS customer_loyalty_level_minimum_points
      FROM appointments
      INNER JOIN customers ON customers.id = appointments.customer_id
        AND customers.business_id = appointments.business_id
      LEFT JOIN loyalty_levels ON loyalty_levels.id = customers.loyalty_level_id
        AND loyalty_levels.business_id = customers.business_id
      WHERE appointments.business_id = $1
        AND ($2::timestamptz IS NULL OR end_at > $2::timestamptz)
        AND ($3::timestamptz IS NULL OR start_at < $3::timestamptz)
        AND ($4::uuid IS NULL OR appointments.employee_id = $4::uuid)
        AND ($5::uuid IS NULL OR appointments.customer_id = $5::uuid)
        AND ($6::varchar IS NULL OR appointments.status = $6::varchar)
      ORDER BY appointments.start_at ASC`,
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

  async listByCustomerAccount(
    organizationId: string,
    accountId: string,
    filters: {
      from?: string;
      to?: string;
      businessId?: string;
      status?: AppointmentStatus;
    },
  ): Promise<CustomerAppointmentRecord[]> {
    const result = await this.databaseService.query<CustomerAppointmentRecord>(
      `SELECT
        appointments.id,
        appointments.reference_code,
        appointments.status,
        appointments.start_at,
        appointments.end_at,
        businesses.id AS business_id,
        businesses.name AS business_name,
        employees.id AS employee_id,
        employees.first_name AS employee_first_name,
        employees.last_name AS employee_last_name,
        services.id AS service_id,
        services.name AS service_name
      FROM appointments
      INNER JOIN customers
        ON customers.id = appointments.customer_id
        AND customers.organization_id = appointments.organization_id
      INNER JOIN businesses ON businesses.id = appointments.business_id
      INNER JOIN employees ON employees.id = appointments.employee_id
      INNER JOIN services ON services.id = appointments.service_id
      WHERE appointments.organization_id = $1
        AND customers.customer_account_id = $2
        AND ($3::timestamptz IS NULL OR appointments.end_at > $3::timestamptz)
        AND ($4::timestamptz IS NULL OR appointments.start_at < $4::timestamptz)
        AND ($5::uuid IS NULL OR appointments.business_id = $5::uuid)
        AND ($6::varchar IS NULL OR appointments.status = $6::varchar)
      ORDER BY appointments.start_at ASC`,
      [
        organizationId,
        accountId,
        filters.from ?? null,
        filters.to ?? null,
        filters.businessId ?? null,
        filters.status ?? null,
      ],
    );
    return result.rows;
  }

  async findByCustomerAccount(
    organizationId: string,
    accountId: string,
    appointmentId: string,
  ): Promise<AppointmentRecord | null> {
    const result = await this.databaseService.query<AppointmentRecord>(
      `SELECT appointments.*
      FROM appointments
      INNER JOIN customers
        ON customers.id = appointments.customer_id
        AND customers.organization_id = appointments.organization_id
      WHERE appointments.id = $1
        AND appointments.organization_id = $2
        AND customers.customer_account_id = $3
      LIMIT 1`,
      [appointmentId, organizationId, accountId],
    );
    return result.rows[0] ?? null;
  }

  async listOccupancy(
    businessId: string,
    from: string,
    to: string,
    employeeId?: string,
  ): Promise<AppointmentOccupancy> {
    const [appointments, blocks] = await Promise.all([
      this.databaseService.query<AppointmentRecord>(
        `SELECT * FROM appointments WHERE business_id = $1
          AND status IN ('PENDING', 'CONFIRMED')
          AND occupied_start_at < $3 AND occupied_end_at > $2
          AND ($4::uuid IS NULL OR employee_id = $4::uuid)
        ORDER BY occupied_start_at ASC`,
        [businessId, from, to, employeeId ?? null],
      ),
      this.databaseService.query<CalendarBlockOccupancy>(
        `SELECT id, employee_id, type, start_at, end_at, reason FROM calendar_blocks
          WHERE business_id = $1 AND start_at < $3 AND end_at > $2
          AND ($4::uuid IS NULL OR employee_id = $4::uuid OR employee_id IS NULL)
        ORDER BY start_at ASC`,
        [businessId, from, to, employeeId ?? null],
      ),
    ]);
    return { appointments: appointments.rows, blocks: blocks.rows };
  }

  async findById(
    businessId: string,
    appointmentId: string,
  ): Promise<AppointmentWithCustomerLoyaltyRecord | null> {
    const result =
      await this.databaseService.query<AppointmentWithCustomerLoyaltyRecord>(
        `SELECT appointments.*, customers.points_balance AS customer_points_balance,
        loyalty_levels.id AS customer_loyalty_level_id,
        loyalty_levels.name AS customer_loyalty_level_name,
        loyalty_levels.minimum_points AS customer_loyalty_level_minimum_points
      FROM appointments
      INNER JOIN customers ON customers.id = appointments.customer_id
        AND customers.business_id = appointments.business_id
      LEFT JOIN loyalty_levels ON loyalty_levels.id = customers.loyalty_level_id
        AND loyalty_levels.business_id = customers.business_id
      WHERE appointments.id = $1 AND appointments.business_id = $2
      LIMIT 1`,
        [appointmentId, businessId],
      );
    return result.rows[0] ?? null;
  }

  async prepareAppointmentReminders(): Promise<AppointmentReminderRecord[]> {
    const result = await this.databaseService.query<AppointmentReminderRecord>(
      `WITH candidates AS (
        SELECT appointments.id AS appointment_id, appointments.organization_id,
          appointments.customer_id, appointments.reference_code,
          appointments.start_at, customers.email, businesses.name AS business_name,
          businesses.timezone, services.name AS service_name,
          employees.first_name AS employee_first_name,
          employees.last_name AS employee_last_name
        FROM appointments
        INNER JOIN customers ON customers.id = appointments.customer_id
          AND customers.business_id = appointments.business_id
          AND customers.anonymized_at IS NULL
        INNER JOIN businesses ON businesses.id = appointments.business_id
          AND businesses.organization_id = appointments.organization_id
          AND businesses.status = 'ACTIVE'
        INNER JOIN business_notification_settings
          ON business_notification_settings.business_id = appointments.business_id
          AND business_notification_settings.organization_id = appointments.organization_id
          AND business_notification_settings.appointment_reminder_enabled = TRUE
        INNER JOIN services ON services.id = appointments.service_id
          AND services.business_id = appointments.business_id
        INNER JOIN employees ON employees.id = appointments.employee_id
          AND employees.business_id = appointments.business_id
        WHERE appointments.status = 'CONFIRMED'
          AND appointments.start_at > NOW()
            + make_interval(
              hours => business_notification_settings.appointment_reminder_hours_before
            ) - INTERVAL '15 minutes'
          AND appointments.start_at <= NOW()
            + make_interval(
              hours => business_notification_settings.appointment_reminder_hours_before
            ) + INTERVAL '15 minutes'
      ), prepared AS (
        INSERT INTO notifications (
          organization_id, appointment_id, customer_id, channel, type,
          destination, status, scheduled_at, appointment_reminder_start_at
        )
        SELECT organization_id, appointment_id, customer_id, 'EMAIL',
          'APPOINTMENT_REMINDER', email, 'PENDING', NOW(), start_at
        FROM candidates
        ON CONFLICT (appointment_id, type, appointment_reminder_start_at)
          WHERE type = 'APPOINTMENT_REMINDER'
        DO UPDATE SET status = 'PENDING', error_message = NULL,
          scheduled_at = NOW(), updated_at = NOW()
          WHERE notifications.status = 'FAILED'
        RETURNING id, appointment_id, appointment_reminder_start_at
      )
      SELECT prepared.id, candidates.email, candidates.business_name,
        candidates.reference_code, candidates.service_name,
        candidates.employee_first_name, candidates.employee_last_name,
        candidates.start_at, candidates.timezone
      FROM prepared
      INNER JOIN candidates ON candidates.appointment_id = prepared.appointment_id
        AND candidates.start_at = prepared.appointment_reminder_start_at`,
    );
    return result.rows;
  }

  async markAppointmentReminderSent(notificationId: string): Promise<void> {
    await this.databaseService.query(
      `UPDATE notifications
      SET status = 'SENT', sent_at = NOW(), error_message = NULL
      WHERE id = $1`,
      [notificationId],
    );
  }

  async markAppointmentReminderFailed(
    notificationId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.databaseService.query(
      `UPDATE notifications
      SET status = 'FAILED', error_message = $2
      WHERE id = $1`,
      [notificationId, errorMessage.slice(0, 1_000)],
    );
  }

  async updateMembershipEligibility(
    appointment: AppointmentRecord,
    countsTowardMembership: boolean,
  ): Promise<AppointmentRecord | null> {
    const result = await this.databaseService.query<AppointmentRecord>(
      `UPDATE appointments
      SET counts_toward_membership = $1,
          updated_at = NOW()
      WHERE id = $2
        AND business_id = $3
        AND organization_id = $4
      RETURNING *`,
      [
        countsTowardMembership,
        appointment.id,
        appointment.business_id,
        appointment.organization_id,
      ],
    );
    return result.rows[0] ?? null;
  }

  async findDetailByCustomerAccount(
    organizationId: string,
    accountId: string,
    appointmentId: string,
  ): Promise<CustomerAppointmentDetailRecord | null> {
    const result =
      await this.databaseService.query<CustomerAppointmentDetailRecord>(
        `SELECT
          appointments.id,
          appointments.reference_code,
          appointments.status,
          appointments.start_at,
          appointments.end_at,
          appointments.price_amount,
          appointments.currency_code,
          appointments.customer_notes,
          appointments.cancellation_reason,
          appointments.cancelled_at,
          businesses.id AS business_id,
          businesses.name AS business_name,
          employees.id AS employee_id,
          employees.first_name AS employee_first_name,
          employees.last_name AS employee_last_name,
          services.id AS service_id,
          services.name AS service_name,
          services.description AS service_description
        FROM appointments
        INNER JOIN customers
          ON customers.id = appointments.customer_id
          AND customers.organization_id = appointments.organization_id
        INNER JOIN businesses ON businesses.id = appointments.business_id
        INNER JOIN employees ON employees.id = appointments.employee_id
        INNER JOIN services ON services.id = appointments.service_id
        WHERE appointments.id = $1
          AND appointments.organization_id = $2
          AND customers.customer_account_id = $3
        LIMIT 1`,
        [appointmentId, organizationId, accountId],
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
    status: Extract<AppointmentStatus, "PENDING" | "CONFIRMED">,
    requiresApproval: boolean,
    loyaltyRuleSnapshot: LoyaltyRuleSnapshot | null,
  ): Promise<AppointmentRecord> {
    const result = await this.databaseService.query<AppointmentRecord>(
      `UPDATE appointments SET customer_id = $1, employee_id = $2, service_id = $3, start_at = $4,
        end_at = $5, occupied_start_at = $6, occupied_end_at = $7,
        duration_minutes = CASE WHEN $8 THEN $9 ELSE duration_minutes END,
        buffer_before_minutes = CASE WHEN $8 THEN $10 ELSE buffer_before_minutes END,
        buffer_after_minutes = CASE WHEN $8 THEN $11 ELSE buffer_after_minutes END,
        price_amount = CASE WHEN $8 THEN $12 ELSE price_amount END,
        currency_code = CASE WHEN $8 THEN $13 ELSE currency_code END,
        loyalty_rule_snapshot = CASE WHEN $8 THEN $14::jsonb ELSE loyalty_rule_snapshot END,
        customer_notes = COALESCE($15, customer_notes), internal_notes = COALESCE($16, internal_notes),
        status = $17, requires_approval = $18, conflict_override = FALSE, updated_at = NOW()
      WHERE id = $19 AND business_id = $20 AND organization_id = $21 AND status IN ('PENDING', 'CONFIRMED')
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
        loyaltyRuleSnapshot === null
          ? null
          : JSON.stringify(loyaltyRuleSnapshot),
        dto.customerNotes,
        dto.internalNotes,
        status,
        requiresApproval,
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
    conflictOverride = false,
    cancellationActor: "CLIENT" | "EMPLOYEE" | "ADMIN" | "SYSTEM" = "ADMIN",
  ): Promise<AppointmentRecord | null> {
    const result = await this.databaseService.query<AppointmentRecord>(
      `UPDATE appointments SET status = $1, cancellation_actor = CASE WHEN $1 = 'CANCELLED' THEN $4 ELSE NULL END,
        cancellation_reason = CASE WHEN $1 = 'CANCELLED' THEN $2 ELSE NULL END,
        cancelled_at = CASE WHEN $1 = 'CANCELLED' THEN NOW() ELSE NULL END,
        completed_at = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE NULL END,
        requires_approval = CASE WHEN $1 = 'CONFIRMED' THEN FALSE ELSE requires_approval END,
        conflict_override = CASE WHEN $1 = 'CONFIRMED' THEN $3 ELSE conflict_override END,
        updated_at = NOW()
      WHERE id = $5 AND business_id = $6 AND organization_id = $7 AND status IN ('PENDING', 'CONFIRMED')
      RETURNING *`,
      [
        status,
        reason ?? null,
        conflictOverride,
        cancellationActor,
        appointment.id,
        appointment.business_id,
        appointment.organization_id,
      ],
    );
    return result.rows[0] ?? null;
  }

  async isAssignedEmployee(
    userId: string,
    appointment: AppointmentRecord,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM employees
        INNER JOIN users ON users.id = employees.user_id
        WHERE employees.id = $1 AND employees.business_id = $2
          AND employees.organization_id = $3 AND employees.user_id = $4
          AND employees.is_active = TRUE AND users.status = 'ACTIVE') AS exists`,
      [
        appointment.employee_id,
        appointment.business_id,
        appointment.organization_id,
        userId,
      ],
    );
    return result.rows[0]?.exists ?? false;
  }

  async createRescheduleProposal(input: {
    appointment: AppointmentRecord;
    employeeId: string;
    startAt: Date;
    endAt: Date;
    occupiedStartAt: Date;
    occupiedEndAt: Date;
    tokenHash: string;
    expiresAt: Date;
    userId: string;
    message?: string;
  }): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query(
        "UPDATE appointment_reschedule_proposals SET status = 'EXPIRED' WHERE appointment_id = $1 AND status = 'PENDING_CUSTOMER'",
        [input.appointment.id],
      );
      await client.query(
        `INSERT INTO appointment_reschedule_proposals (organization_id,business_id,appointment_id,employee_id,start_at,end_at,occupied_start_at,occupied_end_at,token_hash,expires_at,created_by_user_id,message) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          input.appointment.organization_id,
          input.appointment.business_id,
          input.appointment.id,
          input.employeeId,
          input.startAt,
          input.endAt,
          input.occupiedStartAt,
          input.occupiedEndAt,
          input.tokenHash,
          input.expiresAt,
          input.userId,
          input.message ?? null,
        ],
      );
    });
  }

  async findRescheduleProposal(
    tokenHash: string,
  ): Promise<RescheduleProposalRecord | null> {
    const result = await this.databaseService.query<RescheduleProposalRecord>(
      `SELECT p.id,p.appointment_id,p.organization_id,p.business_id,p.employee_id,p.start_at,p.end_at,p.occupied_start_at,p.occupied_end_at,a.customer_id,a.service_id,a.status AS appointment_status,a.start_at AS appointment_start_at,a.reference_code FROM appointment_reschedule_proposals p INNER JOIN appointments a ON a.id=p.appointment_id AND a.organization_id=p.organization_id WHERE p.token_hash=$1 AND p.status='PENDING_CUSTOMER' AND p.expires_at > NOW() LIMIT 1`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  async customerEmail(appointment: AppointmentRecord): Promise<string | null> {
    const r = await this.databaseService.query<{ email: string }>(
      "SELECT email FROM customers WHERE id=$1 AND business_id=$2 AND organization_id=$3 AND anonymized_at IS NULL",
      [
        appointment.customer_id,
        appointment.business_id,
        appointment.organization_id,
      ],
    );
    return r.rows[0]?.email ?? null;
  }

  async acceptRescheduleProposal(
    proposal: RescheduleProposalRecord,
  ): Promise<AppointmentRecord | null> {
    return this.databaseService.transaction(async (client) => {
      const locked = await client.query<{ id: string }>(
        "SELECT id FROM appointment_reschedule_proposals WHERE id=$1 AND status='PENDING_CUSTOMER' AND expires_at > NOW() FOR UPDATE",
        [proposal.id],
      );
      if (!locked.rows[0]) return null;
      const updated = await client.query<AppointmentRecord>(
        `UPDATE appointments SET employee_id=$1,start_at=$2,end_at=$3,occupied_start_at=$4,occupied_end_at=$5,updated_at=NOW() WHERE id=$6 AND organization_id=$7 AND business_id=$8 AND status IN ('PENDING','CONFIRMED') RETURNING *`,
        [
          proposal.employee_id,
          proposal.start_at,
          proposal.end_at,
          proposal.occupied_start_at,
          proposal.occupied_end_at,
          proposal.appointment_id,
          proposal.organization_id,
          proposal.business_id,
        ],
      );
      if (!updated.rows[0]) return null;
      await client.query(
        "UPDATE appointment_reschedule_proposals SET status='ACCEPTED', responded_at=NOW() WHERE id=$1",
        [proposal.id],
      );
      return updated.rows[0];
    });
  }

  async rejectRescheduleProposal(tokenHash: string): Promise<boolean> {
    const r = await this.databaseService.query(
      "UPDATE appointment_reschedule_proposals SET status='REJECTED', responded_at=NOW() WHERE token_hash=$1 AND status='PENDING_CUSTOMER' AND expires_at > NOW()",
      [tokenHash],
    );
    return (r.rowCount ?? 0) === 1;
  }
}
