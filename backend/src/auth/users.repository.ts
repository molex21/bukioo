import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { UpdateMyProfileDto } from "./dto/update-my-profile.dto";

export interface UserRecord {
  id: string;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  password_hash: string;
  password_change_required: boolean;
  email_verified_at: Date | null;
  preferred_locale: string | null;
  is_superadmin: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserOrganizationRecord {
  id: string;
  name: string;
  logo_url: string | null;
  role: "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE" | "CLIENT";
}

export interface UserBusinessRecord {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: "ACTIVE" | "SUSPENDED";
}

@Injectable()
export class UsersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.databaseService.query<UserRecord>(
      "SELECT id, email, phone, first_name, last_name, password_hash, password_change_required, email_verified_at, preferred_locale, is_superadmin, status, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.databaseService.query<UserRecord>(
      "SELECT id, email, phone, first_name, last_name, password_hash, password_change_required, email_verified_at, preferred_locale, is_superadmin, status, created_at, updated_at FROM users WHERE id = $1 LIMIT 1",
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findActiveOrganizationsByUserId(
    userId: string,
  ): Promise<UserOrganizationRecord[]> {
    const result = await this.databaseService.query<UserOrganizationRecord>(
      `SELECT organizations.id, organizations.name, organizations.logo_url,
        organization_memberships.role
      FROM organization_memberships
      INNER JOIN organizations
        ON organizations.id = organization_memberships.organization_id
      WHERE organization_memberships.user_id = $1
        AND organization_memberships.status = 'ACTIVE'
        AND organizations.status = 'ACTIVE'
      ORDER BY organizations.name ASC`,
      [userId],
    );

    return result.rows;
  }

  async findAccessibleBusinessesByUserId(
    userId: string,
  ): Promise<UserBusinessRecord[]> {
    const result = await this.databaseService.query<UserBusinessRecord>(
      `SELECT businesses.id, businesses.organization_id, businesses.name,
        businesses.slug, businesses.logo_url, businesses.status
      FROM businesses
      INNER JOIN organization_memberships
        ON organization_memberships.organization_id = businesses.organization_id
      LEFT JOIN business_memberships
        ON business_memberships.business_id = businesses.id
        AND business_memberships.organization_id = businesses.organization_id
        AND business_memberships.user_id = $1
      WHERE organization_memberships.user_id = $1
        AND organization_memberships.status = 'ACTIVE'
        AND businesses.status = 'ACTIVE'
        AND (
          organization_memberships.role IN ('OWNER', 'ADMIN')
          OR business_memberships.user_id IS NOT NULL
        )
      ORDER BY businesses.name ASC`,
      [userId],
    );

    return result.rows;
  }

  async create(email: string, passwordHash: string): Promise<UserRecord> {
    const result = await this.databaseService.query<UserRecord>(
      "INSERT INTO users (email, password_hash, password_change_required) VALUES ($1, $2, TRUE) RETURNING id, email, phone, first_name, last_name, password_hash, password_change_required, email_verified_at, preferred_locale, is_superadmin, status, created_at, updated_at",
      [email, passwordHash],
    );
    return result.rows[0];
  }

  async updateMyProfile(
    userId: string,
    input: UpdateMyProfileDto,
  ): Promise<UserRecord | null> {
    return this.databaseService.transaction(async (client) => {
      const result = await client.query<UserRecord>(
        `UPDATE users
        SET first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            phone = COALESCE($3, phone),
            preferred_locale = COALESCE($4, preferred_locale),
            updated_at = NOW()
        WHERE id = $5
        RETURNING id, email, phone, first_name, last_name, password_hash,
          password_change_required, email_verified_at, preferred_locale,
          is_superadmin, status, created_at, updated_at`,
        [
          input.firstName,
          input.lastName,
          input.phone,
          input.preferredLocale,
          userId,
        ],
      );
      const user = result.rows[0];
      if (!user) return null;

      await client.query(
        `UPDATE employees
        SET first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            phone = COALESCE($3, phone),
            updated_at = NOW()
        WHERE user_id = $4 AND is_active = TRUE`,
        [input.firstName, input.lastName, input.phone, userId],
      );
      return user;
    });
  }
}
