import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { CreateServiceDto } from "./dto/create-service.dto";
import type { UpdateServiceDto } from "./dto/update-service.dto";

export interface ServiceRecord {
  id: string;
  organization_id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  minimum_booking_notice_minutes: number | null;
  maximum_booking_advance_days: number | null;
  same_day_booking: boolean | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
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
        (organization_id, business_id, category_id, name, description, price,
         duration_minutes, buffer_before_minutes, buffer_after_minutes,
         minimum_booking_notice_minutes, maximum_booking_advance_days, same_day_booking)
       SELECT organization_id, id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
       FROM businesses WHERE id = $1
       RETURNING id, organization_id, business_id, category_id, name, description,
         price, duration_minutes, buffer_before_minutes, buffer_after_minutes,
         minimum_booking_notice_minutes, maximum_booking_advance_days, same_day_booking,
         is_active, created_at, updated_at, archived_at`,
      [
        businessId,
        dto.categoryId ?? null,
        dto.name,
        dto.description ?? null,
        dto.price ?? null,
        dto.durationMinutes,
        dto.bufferBeforeMinutes ?? 0,
        dto.bufferAfterMinutes ?? 0,
        dto.minimumBookingNoticeMinutes ?? null,
        dto.maximumBookingAdvanceDays ?? null,
        dto.sameDayBooking ?? null,
      ],
    );
    return result.rows[0];
  }

  async listByBusiness(businessId: string): Promise<ServiceRecord[]> {
    const result = await this.databaseService.query<ServiceRecord>(
      `SELECT id, organization_id, business_id, category_id, name, description, price,
        duration_minutes, buffer_before_minutes, buffer_after_minutes,
        minimum_booking_notice_minutes, maximum_booking_advance_days, same_day_booking,
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
      `SELECT id, organization_id, business_id, category_id, name, description, price,
        duration_minutes, buffer_before_minutes, buffer_after_minutes,
        minimum_booking_notice_minutes, maximum_booking_advance_days, same_day_booking,
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
        duration_minutes = COALESCE($5, duration_minutes),
        buffer_before_minutes = COALESCE($6, buffer_before_minutes),
        buffer_after_minutes = COALESCE($7, buffer_after_minutes),
        minimum_booking_notice_minutes = COALESCE($8, minimum_booking_notice_minutes),
        maximum_booking_advance_days = COALESCE($9, maximum_booking_advance_days),
        same_day_booking = COALESCE($10, same_day_booking), is_active = COALESCE($11, is_active),
        updated_at = NOW()
      WHERE id = $12 AND business_id = $13 AND organization_id = $14 AND archived_at IS NULL
      RETURNING id, organization_id, business_id, category_id, name, description, price,
        duration_minutes, buffer_before_minutes, buffer_after_minutes,
        minimum_booking_notice_minutes, maximum_booking_advance_days, same_day_booking,
        is_active, created_at, updated_at, archived_at`,
      [
        dto.categoryId,
        dto.name,
        dto.description,
        dto.price,
        dto.durationMinutes,
        dto.bufferBeforeMinutes,
        dto.bufferAfterMinutes,
        dto.minimumBookingNoticeMinutes,
        dto.maximumBookingAdvanceDays,
        dto.sameDayBooking,
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
}
