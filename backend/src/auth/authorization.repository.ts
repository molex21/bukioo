import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { OrganizationRole } from "./roles.decorator";

interface RoleRecord {
  role: OrganizationRole;
}

@Injectable()
export class AuthorizationRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findOrganizationRole(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationRole | null> {
    const result = await this.databaseService.query<RoleRecord>(
      `SELECT organization_memberships.role
      FROM organization_memberships
      INNER JOIN users ON users.id = organization_memberships.user_id
      WHERE organization_memberships.organization_id = $1
        AND organization_memberships.user_id = $2
        AND organization_memberships.status = 'ACTIVE'
        AND users.status = 'ACTIVE'
      LIMIT 1`,
      [organizationId, userId],
    );

    return result.rows[0]?.role ?? null;
  }

  async findBusinessRole(
    userId: string,
    businessId: string,
  ): Promise<OrganizationRole | null> {
    const result = await this.databaseService.query<RoleRecord>(
      `SELECT organization_memberships.role
      FROM businesses
      INNER JOIN organization_memberships
        ON organization_memberships.organization_id = businesses.organization_id
      INNER JOIN users ON users.id = organization_memberships.user_id
      WHERE businesses.id = $1
        AND businesses.status = 'ACTIVE'
        AND organization_memberships.user_id = $2
        AND organization_memberships.status = 'ACTIVE'
        AND users.status = 'ACTIVE'
      LIMIT 1`,
      [businessId, userId],
    );

    return result.rows[0]?.role ?? null;
  }
}
