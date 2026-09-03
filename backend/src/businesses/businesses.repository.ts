import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { CreateBusinessDto } from "./dto/create-business.dto";
import type { UpdateBusinessDto } from "./dto/update-business.dto";

export interface BusinessRecord {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  timezone: string;
  logo_url: string | null;
  status: "ACTIVE" | "SUSPENDED";
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class BusinessesRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async canManageOrganization(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM organization_memberships
        INNER JOIN users ON users.id = organization_memberships.user_id
        WHERE organization_memberships.organization_id = $1
          AND organization_memberships.user_id = $2
          AND organization_memberships.status = 'ACTIVE'
          AND organization_memberships.role IN ('OWNER', 'ADMIN')
          AND users.status = 'ACTIVE'
      ) AS exists`,
      [organizationId, userId],
    );

    return result.rows[0]?.exists ?? false;
  }

  async create(
    createBusinessDto: CreateBusinessDto,
    creatorUserId: string,
  ): Promise<BusinessRecord> {
    return this.databaseService.transaction(async (client) => {
      const result = await client.query<BusinessRecord>(
        `INSERT INTO businesses
          (organization_id, name, slug, email, phone, timezone, logo_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, organization_id, name, slug, email, phone, timezone,
          logo_url, status, created_at, updated_at`,
        [
          createBusinessDto.organizationId,
          createBusinessDto.name,
          createBusinessDto.slug,
          createBusinessDto.email ?? null,
          createBusinessDto.phone ?? null,
          createBusinessDto.timezone ?? "UTC",
          createBusinessDto.logoUrl ?? null,
        ],
      );
      const business = result.rows[0];

      await client.query(
        `INSERT INTO business_memberships
          (business_id, user_id, organization_id)
        VALUES ($1, $2, $3)`,
        [business.id, creatorUserId, business.organization_id],
      );
      await client.query(
        `INSERT INTO business_loyalty_settings (business_id, organization_id)
        VALUES ($1, $2)`,
        [business.id, business.organization_id],
      );
      await client.query(
        `INSERT INTO business_notification_settings (business_id, organization_id)
        VALUES ($1, $2)`,
        [business.id, business.organization_id],
      );

      return business;
    });
  }

  async listByOrganization(organizationId: string): Promise<BusinessRecord[]> {
    const result = await this.databaseService.query<BusinessRecord>(
      `SELECT id, organization_id, name, slug, email, phone, timezone, logo_url,
        status, created_at, updated_at
      FROM businesses
      WHERE organization_id = $1
      ORDER BY created_at ASC`,
      [organizationId],
    );

    return result.rows;
  }

  async findManagedById(
    businessId: string,
    userId: string,
  ): Promise<BusinessRecord | null> {
    const result = await this.databaseService.query<BusinessRecord>(
      `SELECT businesses.id, businesses.organization_id, businesses.name,
        businesses.slug, businesses.email, businesses.phone, businesses.timezone,
        businesses.logo_url, businesses.status, businesses.created_at,
        businesses.updated_at
      FROM businesses
      INNER JOIN organization_memberships
        ON organization_memberships.organization_id = businesses.organization_id
      INNER JOIN users ON users.id = organization_memberships.user_id
      WHERE businesses.id = $1
        AND organization_memberships.user_id = $2
        AND organization_memberships.status = 'ACTIVE'
        AND organization_memberships.role IN ('OWNER', 'ADMIN')
        AND users.status = 'ACTIVE'
      LIMIT 1`,
      [businessId, userId],
    );

    return result.rows[0] ?? null;
  }

  async findAccessibleById(
    businessId: string,
    userId: string,
  ): Promise<BusinessRecord | null> {
    const result = await this.databaseService.query<BusinessRecord>(
      `SELECT businesses.id, businesses.organization_id, businesses.name,
        businesses.slug, businesses.email, businesses.phone, businesses.timezone,
        businesses.logo_url, businesses.status, businesses.created_at,
        businesses.updated_at
      FROM businesses
      INNER JOIN organization_memberships
        ON organization_memberships.organization_id = businesses.organization_id
      INNER JOIN users ON users.id = organization_memberships.user_id
      WHERE businesses.id = $1
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
      LIMIT 1`,
      [businessId, userId],
    );

    return result.rows[0] ?? null;
  }

  async update(
    business: BusinessRecord,
    updateBusinessDto: UpdateBusinessDto,
  ): Promise<BusinessRecord> {
    const result = await this.databaseService.query<BusinessRecord>(
      `UPDATE businesses
      SET name = COALESCE($1, name),
          slug = COALESCE($2, slug),
          email = COALESCE($3, email),
          phone = COALESCE($4, phone),
          timezone = COALESCE($5, timezone),
          status = COALESCE($6, status),
          logo_url = CASE WHEN $7 THEN $8 ELSE logo_url END,
          updated_at = NOW()
      WHERE id = $9
        AND organization_id = $10
      RETURNING id, organization_id, name, slug, email, phone, timezone, logo_url,
        status, created_at, updated_at`,
      [
        updateBusinessDto.name?.trim(),
        updateBusinessDto.slug?.trim().toLowerCase(),
        updateBusinessDto.email?.trim().toLowerCase(),
        updateBusinessDto.phone?.trim(),
        updateBusinessDto.timezone?.trim(),
        updateBusinessDto.status,
        Object.prototype.hasOwnProperty.call(updateBusinessDto, "logoUrl"),
        typeof updateBusinessDto.logoUrl === "string"
          ? updateBusinessDto.logoUrl.trim()
          : (updateBusinessDto.logoUrl ?? null),
        business.id,
        business.organization_id,
      ],
    );

    return result.rows[0];
  }

  async countByOrganization(organizationId: string): Promise<number> {
    const result = await this.databaseService.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM businesses WHERE organization_id = $1",
      [organizationId],
    );

    return Number(result.rows[0]?.count ?? 0);
  }

  async remove(business: BusinessRecord): Promise<boolean> {
    const result = await this.databaseService.query(
      "DELETE FROM businesses WHERE id = $1 AND organization_id = $2",
      [business.id, business.organization_id],
    );

    return (result.rowCount ?? 0) === 1;
  }
}
