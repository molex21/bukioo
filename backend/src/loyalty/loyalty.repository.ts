import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { CreateLoyaltyLevelDto } from "./dto/create-loyalty-level.dto";
import type { UpdateLoyaltyLevelDto } from "./dto/update-loyalty-level.dto";

export interface LoyaltyLevelRecord {
  id: string;
  organization_id: string;
  business_id: string;
  name: string;
  minimum_points: number;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class LoyaltyRepository {
  constructor(private readonly databaseService: DatabaseService) {}

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
              SELECT 1
              FROM business_memberships
              WHERE business_memberships.business_id = businesses.id
                AND business_memberships.user_id = $2
                AND business_memberships.organization_id = businesses.organization_id
            )
          )
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

  async create(
    businessId: string,
    dto: CreateLoyaltyLevelDto,
  ): Promise<LoyaltyLevelRecord> {
    const result = await this.databaseService.query<LoyaltyLevelRecord>(
      `INSERT INTO loyalty_levels
        (organization_id, business_id, name, minimum_points, sort_order)
      SELECT organization_id, id, $2, $3, $4
      FROM businesses
      WHERE id = $1
      RETURNING id, organization_id, business_id, name, minimum_points,
        sort_order, is_active, created_at, updated_at`,
      [businessId, dto.name, dto.minimumPoints, dto.sortOrder ?? 0],
    );

    return result.rows[0];
  }

  async listByBusiness(businessId: string): Promise<LoyaltyLevelRecord[]> {
    const result = await this.databaseService.query<LoyaltyLevelRecord>(
      `SELECT id, organization_id, business_id, name, minimum_points,
        sort_order, is_active, created_at, updated_at
      FROM loyalty_levels
      WHERE business_id = $1
      ORDER BY minimum_points ASC, sort_order ASC, name ASC`,
      [businessId],
    );

    return result.rows;
  }

  async findById(
    businessId: string,
    levelId: string,
  ): Promise<LoyaltyLevelRecord | null> {
    const result = await this.databaseService.query<LoyaltyLevelRecord>(
      `SELECT id, organization_id, business_id, name, minimum_points,
        sort_order, is_active, created_at, updated_at
      FROM loyalty_levels
      WHERE id = $1 AND business_id = $2
      LIMIT 1`,
      [levelId, businessId],
    );

    return result.rows[0] ?? null;
  }

  async update(
    level: LoyaltyLevelRecord,
    dto: UpdateLoyaltyLevelDto,
  ): Promise<LoyaltyLevelRecord> {
    const result = await this.databaseService.query<LoyaltyLevelRecord>(
      `UPDATE loyalty_levels
      SET name = COALESCE($1, name),
          minimum_points = COALESCE($2, minimum_points),
          sort_order = COALESCE($3, sort_order),
          is_active = COALESCE($4, is_active),
          updated_at = NOW()
      WHERE id = $5 AND business_id = $6 AND organization_id = $7
      RETURNING id, organization_id, business_id, name, minimum_points,
        sort_order, is_active, created_at, updated_at`,
      [
        dto.name,
        dto.minimumPoints,
        dto.sortOrder,
        dto.isActive,
        level.id,
        level.business_id,
        level.organization_id,
      ],
    );

    return result.rows[0];
  }

  async countCustomers(level: LoyaltyLevelRecord): Promise<number> {
    const result = await this.databaseService.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
      FROM customers
      WHERE loyalty_level_id = $1
        AND business_id = $2
        AND organization_id = $3
        AND anonymized_at IS NULL`,
      [level.id, level.business_id, level.organization_id],
    );

    return Number(result.rows[0]?.count ?? 0);
  }

  async remove(level: LoyaltyLevelRecord): Promise<boolean> {
    const result = await this.databaseService.query(
      `DELETE FROM loyalty_levels
      WHERE id = $1 AND business_id = $2 AND organization_id = $3`,
      [level.id, level.business_id, level.organization_id],
    );

    return (result.rowCount ?? 0) === 1;
  }
}
