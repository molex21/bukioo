import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { CreateCalendarBlockDto } from "./dto/create-calendar-block.dto";
import type { UpdateCalendarBlockDto } from "./dto/update-calendar-block.dto";
import type { ListCalendarBlocksDto } from "./dto/list-calendar-blocks.dto";

export interface CalendarBlockRecord {
  id: string;
  organization_id: string;
  business_id: string;
  employee_id: string;
  type: string;
  start_at: Date;
  end_at: Date;
  reason: string | null;
  created_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class CalendarBlocksRepository {
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

  async employeeBelongsToBusiness(
    employeeId: string,
    businessId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM employees WHERE id = $1 AND business_id = $2 AND is_active = TRUE) AS exists`,
      [employeeId, businessId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async create(
    businessId: string,
    dto: CreateCalendarBlockDto,
    userId: string,
  ): Promise<CalendarBlockRecord> {
    const result = await this.databaseService.query<CalendarBlockRecord>(
      `INSERT INTO calendar_blocks
        (organization_id, business_id, employee_id, type, start_at, end_at, reason, created_by_user_id)
      SELECT organization_id, id, $2, $3, $4, $5, $6, $7 FROM businesses WHERE id = $1
      RETURNING id, organization_id, business_id, employee_id, type, start_at, end_at,
        reason, created_by_user_id, created_at, updated_at`,
      [
        businessId,
        dto.employeeId,
        dto.type,
        dto.startAt,
        dto.endAt,
        dto.reason ?? null,
        userId,
      ],
    );
    return result.rows[0];
  }

  async listByBusiness(
    businessId: string,
    filters: ListCalendarBlocksDto,
    employeeId?: string,
  ): Promise<CalendarBlockRecord[]> {
    const result = await this.databaseService.query<CalendarBlockRecord>(
      `SELECT id, organization_id, business_id, employee_id, type, start_at, end_at,
        reason, created_by_user_id, created_at, updated_at FROM calendar_blocks
      WHERE business_id = $1
        AND ($2::timestamptz IS NULL OR end_at > $2::timestamptz)
        AND ($3::timestamptz IS NULL OR start_at < $3::timestamptz)
        AND ($4::uuid IS NULL OR employee_id = $4::uuid)
      ORDER BY start_at ASC`,
      [
        businessId,
        filters.from ?? null,
        filters.to ?? null,
        employeeId ?? null,
      ],
    );
    return result.rows;
  }

  async findById(
    businessId: string,
    blockId: string,
  ): Promise<CalendarBlockRecord | null> {
    const result = await this.databaseService.query<CalendarBlockRecord>(
      `SELECT id, organization_id, business_id, employee_id, type, start_at, end_at,
        reason, created_by_user_id, created_at, updated_at FROM calendar_blocks
      WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [blockId, businessId],
    );
    return result.rows[0] ?? null;
  }

  async update(
    block: CalendarBlockRecord,
    dto: UpdateCalendarBlockDto,
  ): Promise<CalendarBlockRecord> {
    const result = await this.databaseService.query<CalendarBlockRecord>(
      `UPDATE calendar_blocks SET type = COALESCE($1, type), start_at = COALESCE($2, start_at),
        end_at = COALESCE($3, end_at), reason = COALESCE($4, reason), updated_at = NOW()
      WHERE id = $5 AND business_id = $6 AND organization_id = $7
      RETURNING id, organization_id, business_id, employee_id, type, start_at, end_at,
        reason, created_by_user_id, created_at, updated_at`,
      [
        dto.type,
        dto.startAt,
        dto.endAt,
        dto.reason,
        block.id,
        block.business_id,
        block.organization_id,
      ],
    );
    return result.rows[0];
  }

  async remove(block: CalendarBlockRecord): Promise<boolean> {
    const result = await this.databaseService.query(
      `DELETE FROM calendar_blocks WHERE id = $1 AND business_id = $2 AND organization_id = $3`,
      [block.id, block.business_id, block.organization_id],
    );
    return (result.rowCount ?? 0) === 1;
  }
}
