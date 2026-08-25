import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { CreateServiceCategoryDto } from "./dto/create-service-category.dto";
import type { UpdateServiceCategoryDto } from "./dto/update-service-category.dto";

export interface ServiceCategoryRecord {
  id: string;
  organization_id: string;
  business_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ServiceCategoriesRepository {
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
    createDto: CreateServiceCategoryDto,
  ): Promise<ServiceCategoryRecord> {
    const result = await this.databaseService.query<ServiceCategoryRecord>(
      `INSERT INTO service_categories
        (organization_id, business_id, name, sort_order)
      SELECT organization_id, id, $2, $3
      FROM businesses
      WHERE id = $1
      RETURNING id, organization_id, business_id, name, sort_order, is_active,
        created_at, updated_at`,
      [businessId, createDto.name, createDto.sortOrder ?? 0],
    );

    return result.rows[0];
  }

  async listByBusiness(businessId: string): Promise<ServiceCategoryRecord[]> {
    const result = await this.databaseService.query<ServiceCategoryRecord>(
      `SELECT id, organization_id, business_id, name, sort_order, is_active,
        created_at, updated_at
      FROM service_categories
      WHERE business_id = $1
      ORDER BY sort_order ASC, name ASC`,
      [businessId],
    );

    return result.rows;
  }

  async findById(
    businessId: string,
    categoryId: string,
  ): Promise<ServiceCategoryRecord | null> {
    const result = await this.databaseService.query<ServiceCategoryRecord>(
      `SELECT id, organization_id, business_id, name, sort_order, is_active,
        created_at, updated_at
      FROM service_categories
      WHERE id = $1
        AND business_id = $2
      LIMIT 1`,
      [categoryId, businessId],
    );

    return result.rows[0] ?? null;
  }

  async update(
    category: ServiceCategoryRecord,
    updateDto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategoryRecord> {
    const result = await this.databaseService.query<ServiceCategoryRecord>(
      `UPDATE service_categories
      SET name = COALESCE($1, name),
          sort_order = COALESCE($2, sort_order),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
      WHERE id = $4
        AND business_id = $5
        AND organization_id = $6
      RETURNING id, organization_id, business_id, name, sort_order, is_active,
        created_at, updated_at`,
      [
        updateDto.name,
        updateDto.sortOrder,
        updateDto.isActive,
        category.id,
        category.business_id,
        category.organization_id,
      ],
    );

    return result.rows[0];
  }

  async countServices(category: ServiceCategoryRecord): Promise<number> {
    const result = await this.databaseService.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
      FROM services
      WHERE category_id = $1
        AND business_id = $2
        AND organization_id = $3`,
      [category.id, category.business_id, category.organization_id],
    );

    return Number(result.rows[0]?.count ?? 0);
  }

  async remove(category: ServiceCategoryRecord): Promise<boolean> {
    const result = await this.databaseService.query(
      `DELETE FROM service_categories
      WHERE id = $1
        AND business_id = $2
        AND organization_id = $3`,
      [category.id, category.business_id, category.organization_id],
    );

    return (result.rowCount ?? 0) === 1;
  }
}
