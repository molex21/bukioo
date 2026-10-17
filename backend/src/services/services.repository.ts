import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { CreateServiceDto } from "./dto/create-service.dto";
import type { UpdateServiceDto } from "./dto/update-service.dto";
import type { ServiceCustomField } from "./dto/service-custom-field.dto";

export interface ServiceRecord {
  id: string;
  organization_id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: string | null;
  price_type: "FIXED" | "FROM";
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  minimum_booking_notice_minutes: number | null;
  maximum_booking_advance_days: number | null;
  same_day_booking: boolean | null;
  auto_confirm_appointments: boolean | null;
  loyalty_earning_type:
    | "INHERIT"
    | "NONE"
    | "FIXED"
    | "AMOUNT_MULTIPLIER"
    | "BOTH";
  loyalty_fixed_points: number | null;
  loyalty_points_per_currency_unit: string | null;
  custom_fields: ServiceCustomField[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

export interface ServiceEmployeeRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

@Injectable()
export class ServicesRepository {
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

  async canManageBusiness(
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
          AND organization_memberships.status = 'ACTIVE'
          AND organization_memberships.role IN ('OWNER', 'ADMIN')
          AND users.status = 'ACTIVE'
      ) AS exists`,
      [businessId, userId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async categoryBelongsToBusiness(
    categoryId: string,
    businessId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM service_categories
        WHERE id = $1 AND business_id = $2 AND is_active = TRUE
      ) AS exists`,
      [categoryId, businessId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async create(
    businessId: string,
    dto: CreateServiceDto,
  ): Promise<ServiceRecord> {
    const result = await this.databaseService.query<ServiceRecord>(
      `INSERT INTO services
        (organization_id, business_id, category_id, name, description, price, price_type,
         duration_minutes, buffer_before_minutes, buffer_after_minutes,
         minimum_booking_notice_minutes, maximum_booking_advance_days, same_day_booking, auto_confirm_appointments,
         loyalty_earning_type, loyalty_fixed_points, loyalty_points_per_currency_unit, custom_fields)
       SELECT organization_id, id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb
       FROM businesses WHERE id = $1
       RETURNING id, organization_id, business_id, category_id, name, description,
        price, price_type, duration_minutes, buffer_before_minutes, buffer_after_minutes,
         minimum_booking_notice_minutes, maximum_booking_advance_days, same_day_booking,
         auto_confirm_appointments, loyalty_earning_type, loyalty_fixed_points,
         loyalty_points_per_currency_unit, custom_fields,
         is_active, created_at, updated_at, archived_at`,
      [
        businessId,
        dto.categoryId ?? null,
        dto.name,
        dto.description ?? null,
        dto.price ?? null,
        dto.priceType ?? "FIXED",
        dto.durationMinutes,
        dto.bufferBeforeMinutes ?? 0,
        dto.bufferAfterMinutes ?? 0,
        dto.minimumBookingNoticeMinutes ?? null,
        dto.maximumBookingAdvanceDays ?? null,
        dto.sameDayBooking ?? null,
        dto.autoConfirmAppointments ?? null,
        dto.loyaltyEarningType ?? "INHERIT",
        dto.loyaltyFixedPoints ?? null,
        dto.loyaltyPointsPerCurrencyUnit ?? null,
        JSON.stringify(dto.customFields ?? []),
      ],
    );
    return result.rows[0];
  }

  async listByBusiness(businessId: string): Promise<ServiceRecord[]> {
    const result = await this.databaseService.query<ServiceRecord>(
      `SELECT id, organization_id, business_id, category_id, name, description, price, price_type,
        duration_minutes, buffer_before_minutes, buffer_after_minutes,
        minimum_booking_notice_minutes, maximum_booking_advance_days, same_day_booking, auto_confirm_appointments,
        loyalty_earning_type, loyalty_fixed_points, loyalty_points_per_currency_unit, custom_fields,
        is_active, created_at, updated_at, archived_at
      FROM services WHERE business_id = $1 AND archived_at IS NULL
      ORDER BY name ASC`,
      [businessId],
    );
    return result.rows;
  }

  async findById(
    businessId: string,
    serviceId: string,
  ): Promise<ServiceRecord | null> {
    const result = await this.databaseService.query<ServiceRecord>(
      `SELECT id, organization_id, business_id, category_id, name, description, price, price_type,
        duration_minutes, buffer_before_minutes, buffer_after_minutes,
        minimum_booking_notice_minutes, maximum_booking_advance_days, same_day_booking, auto_confirm_appointments,
        loyalty_earning_type, loyalty_fixed_points, loyalty_points_per_currency_unit, custom_fields,
        is_active, created_at, updated_at, archived_at
      FROM services WHERE id = $1 AND business_id = $2 AND archived_at IS NULL LIMIT 1`,
      [serviceId, businessId],
    );
    return result.rows[0] ?? null;
  }

  async update(
    service: ServiceRecord,
    dto: UpdateServiceDto,
  ): Promise<ServiceRecord> {
    const result = await this.databaseService.query<ServiceRecord>(
      `UPDATE services SET category_id = COALESCE($1, category_id), name = COALESCE($2, name),
        description = COALESCE($3, description), price = COALESCE($4, price),
        price_type = COALESCE($5, price_type),
        duration_minutes = COALESCE($6, duration_minutes),
        buffer_before_minutes = COALESCE($7, buffer_before_minutes),
        buffer_after_minutes = COALESCE($8, buffer_after_minutes),
        minimum_booking_notice_minutes = COALESCE($9, minimum_booking_notice_minutes),
        maximum_booking_advance_days = COALESCE($10, maximum_booking_advance_days),
        same_day_booking = COALESCE($11, same_day_booking),
        auto_confirm_appointments = CASE WHEN $13 THEN $12 ELSE auto_confirm_appointments END,
        loyalty_earning_type = COALESCE($14, loyalty_earning_type),
        loyalty_fixed_points = COALESCE($15, loyalty_fixed_points),
        loyalty_points_per_currency_unit = COALESCE($16, loyalty_points_per_currency_unit),
        custom_fields = CASE WHEN $18 THEN $17::jsonb ELSE custom_fields END,
        is_active = COALESCE($19, is_active),
        updated_at = NOW()
      WHERE id = $20 AND business_id = $21 AND organization_id = $22 AND archived_at IS NULL
      RETURNING id, organization_id, business_id, category_id, name, description, price, price_type,
        duration_minutes, buffer_before_minutes, buffer_after_minutes,
        minimum_booking_notice_minutes, maximum_booking_advance_days, same_day_booking, auto_confirm_appointments,
        loyalty_earning_type, loyalty_fixed_points, loyalty_points_per_currency_unit, custom_fields,
        is_active, created_at, updated_at, archived_at`,
      [
        dto.categoryId,
        dto.name,
        dto.description,
        dto.price,
        dto.priceType,
        dto.durationMinutes,
        dto.bufferBeforeMinutes,
        dto.bufferAfterMinutes,
        dto.minimumBookingNoticeMinutes,
        dto.maximumBookingAdvanceDays,
        dto.sameDayBooking,
        dto.autoConfirmAppointments ?? null,
        Object.prototype.hasOwnProperty.call(dto, "autoConfirmAppointments"),
        dto.loyaltyEarningType,
        dto.loyaltyFixedPoints,
        dto.loyaltyPointsPerCurrencyUnit,
        dto.customFields === undefined
          ? null
          : JSON.stringify(dto.customFields),
        Object.prototype.hasOwnProperty.call(dto, "customFields"),
        dto.isActive,
        service.id,
        service.business_id,
        service.organization_id,
      ],
    );
    return result.rows[0];
  }

  async countReferences(service: ServiceRecord): Promise<number> {
    const result = await this.databaseService.query<{ count: string }>(
      `SELECT (
        (SELECT COUNT(*) FROM employee_services
          WHERE service_id = $1 AND business_id = $2 AND organization_id = $3)
        +
        (SELECT COUNT(*) FROM appointments
          WHERE service_id = $1 AND business_id = $2 AND organization_id = $3)
      )::text AS count`,
      [service.id, service.business_id, service.organization_id],
    );

    return Number(result.rows[0]?.count ?? 0);
  }

  async remove(service: ServiceRecord): Promise<boolean> {
    const result = await this.databaseService.query(
      `DELETE FROM services
      WHERE id = $1 AND business_id = $2 AND organization_id = $3`,
      [service.id, service.business_id, service.organization_id],
    );
    return (result.rowCount ?? 0) === 1;
  }

  async listEmployees(
    service: ServiceRecord,
  ): Promise<ServiceEmployeeRecord[]> {
    const result = await this.databaseService.query<ServiceEmployeeRecord>(
      `SELECT employees.id, employees.first_name, employees.last_name, employees.email
      FROM employee_services
      INNER JOIN employees
        ON employees.id = employee_services.employee_id
        AND employees.organization_id = employee_services.organization_id
        AND employees.business_id = employee_services.business_id
      WHERE employee_services.service_id = $1
        AND employee_services.organization_id = $2
        AND employee_services.business_id = $3
        AND employees.is_active = TRUE
      ORDER BY employees.first_name ASC, employees.last_name ASC`,
      [service.id, service.organization_id, service.business_id],
    );

    return result.rows;
  }

  async findActiveEmployeeIds(
    businessId: string,
    employeeIds: string[],
  ): Promise<string[]> {
    if (employeeIds.length === 0) {
      return [];
    }

    const result = await this.databaseService.query<{ id: string }>(
      `SELECT id FROM employees
      WHERE business_id = $1
        AND id = ANY($2::uuid[])
        AND is_active = TRUE`,
      [businessId, employeeIds],
    );

    return result.rows.map((employee) => employee.id);
  }

  async replaceEmployees(
    service: ServiceRecord,
    employeeIds: string[],
  ): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `DELETE FROM employee_services
        WHERE service_id = $1
          AND organization_id = $2
          AND business_id = $3`,
        [service.id, service.organization_id, service.business_id],
      );

      if (employeeIds.length > 0) {
        await client.query(
          `INSERT INTO employee_services
            (organization_id, business_id, employee_id, service_id)
          SELECT $1, $2, employee_id, $3
          FROM UNNEST($4::uuid[]) AS employee_id`,
          [
            service.organization_id,
            service.business_id,
            service.id,
            employeeIds,
          ],
        );
      }
    });
  }
}
