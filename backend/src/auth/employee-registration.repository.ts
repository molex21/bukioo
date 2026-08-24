import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { UserRecord } from "./users.repository";

export interface CreateEmployeeRegistrationInput {
  email: string;
  passwordHash: string;
  organizationId: string;
  businessIds: string[];
  role: "MANAGER" | "EMPLOYEE";
}

@Injectable()
export class EmployeeRegistrationRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async canManageEmployees(
    actorUserId: string,
    organizationId: string,
    businessIds: string[],
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
      FROM businesses
      INNER JOIN business_memberships
        ON business_memberships.business_id = businesses.id
        AND business_memberships.organization_id = businesses.organization_id
      INNER JOIN organization_memberships
        ON organization_memberships.user_id = business_memberships.user_id
        AND organization_memberships.organization_id = businesses.organization_id
      WHERE businesses.organization_id = $1
        AND businesses.id = ANY($2::uuid[])
        AND businesses.status = 'ACTIVE'
        AND business_memberships.user_id = $3
        AND organization_memberships.status = 'ACTIVE'
        AND organization_memberships.role IN ('OWNER', 'ADMIN')`,
      [organizationId, businessIds, actorUserId],
    );

    return Number(result.rows[0]?.count ?? 0) === businessIds.length;
  }

  async create(input: CreateEmployeeRegistrationInput): Promise<UserRecord> {
    return this.databaseService.transaction(async (client) => {
      const userResult = await client.query<UserRecord>(
        `INSERT INTO users (email, password_hash, password_change_required)
        VALUES ($1, $2, TRUE)
        RETURNING id, email, password_hash, password_change_required,
          email_verified_at, preferred_locale, is_superadmin, status,
          created_at, updated_at`,
        [input.email, input.passwordHash],
      );
      const user = userResult.rows[0];

      await client.query(
        `INSERT INTO organization_memberships (organization_id, user_id, role)
        VALUES ($1, $2, $3)`,
        [input.organizationId, user.id, input.role],
      );
      await client.query(
        `INSERT INTO business_memberships (business_id, user_id, organization_id)
        SELECT business_id, $1, $2
        FROM UNNEST($3::uuid[]) AS business_id`,
        [user.id, input.organizationId, input.businessIds],
      );

      return user;
    });
  }
}
