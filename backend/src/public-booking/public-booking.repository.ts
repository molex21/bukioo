import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface PublicOrganizationRecord {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

export interface PublicServiceRecord {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  duration_minutes: number;
  business_id: string;
  business_name: string;
}

export interface PublicEmployeeRecord {
  id: string;
  first_name: string;
  last_name: string;
}

@Injectable()
export class PublicBookingRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findActiveOrganization(
    slug: string,
  ): Promise<PublicOrganizationRecord | null> {
    const result = await this.databaseService.query<PublicOrganizationRecord>(
      `SELECT id, name, slug, timezone
      FROM organizations
      WHERE LOWER(slug) = LOWER($1) AND status = 'ACTIVE'
      LIMIT 1`,
      [slug],
    );
    return result.rows[0] ?? null;
  }

  async listActiveServices(
    organizationId: string,
    businessId: string,
  ): Promise<PublicServiceRecord[]> {
    const result = await this.databaseService.query<PublicServiceRecord>(
      `SELECT services.id, services.name, services.description, services.price,
        services.duration_minutes, businesses.id AS business_id,
        businesses.name AS business_name
      FROM services
      INNER JOIN businesses
        ON businesses.id = services.business_id
        AND businesses.organization_id = services.organization_id
      WHERE services.organization_id = $1
        AND services.business_id = $2
        AND services.is_active = TRUE AND services.archived_at IS NULL
        AND businesses.status = 'ACTIVE'
      ORDER BY businesses.name ASC, services.name ASC`,
      [organizationId, businessId],
    );
    return result.rows;
  }

  async listActiveEmployees(
    organizationId: string,
    businessId: string,
    serviceId: string,
  ): Promise<PublicEmployeeRecord[]> {
    const result = await this.databaseService.query<PublicEmployeeRecord>(
      `SELECT employees.id, employees.first_name, employees.last_name
      FROM employees
      INNER JOIN employee_services
        ON employee_services.employee_id = employees.id
        AND employee_services.organization_id = employees.organization_id
      INNER JOIN services
        ON services.id = employee_services.service_id
        AND services.organization_id = employee_services.organization_id
      INNER JOIN businesses
        ON businesses.id = employees.business_id
        AND businesses.organization_id = employees.organization_id
      WHERE employees.organization_id = $1
        AND employees.business_id = $2
        AND employees.is_active = TRUE AND employees.archived_at IS NULL
        AND services.id = $3 AND services.business_id = employees.business_id
        AND services.is_active = TRUE AND services.archived_at IS NULL
        AND businesses.status = 'ACTIVE'
      ORDER BY employees.first_name ASC, employees.last_name ASC`,
      [organizationId, businessId, serviceId],
    );
    return result.rows;
  }
}
