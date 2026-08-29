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

  async findOrCreateCustomer(input: {
    organizationId: string;
    businessId: string;
    firstName: string;
    lastName?: string;
    email: string;
    phone: string;
  }): Promise<{ id: string } | null> {
    const result = await this.databaseService.query<{ id: string }>(
      `WITH business AS (SELECT id, organization_id FROM businesses WHERE id = $1 AND organization_id = $2 AND status = 'ACTIVE'),
      existing AS (SELECT customers.id FROM customers INNER JOIN business ON business.id = customers.business_id AND business.organization_id = customers.organization_id WHERE LOWER(customers.email) = LOWER($3) AND customers.anonymized_at IS NULL LIMIT 1),
      created AS (INSERT INTO customers (organization_id, business_id, first_name, last_name, email, phone, customer_account_id) SELECT organization_id, id, $4, $5, LOWER($3), $6, (SELECT id FROM customer_accounts WHERE organization_id = $2 AND LOWER(email) = LOWER($3) AND status = 'ACTIVE' LIMIT 1) FROM business WHERE NOT EXISTS (SELECT 1 FROM existing) RETURNING id)
      SELECT id FROM existing UNION ALL SELECT id FROM created LIMIT 1`,
      [
        input.businessId,
        input.organizationId,
        input.email,
        input.firstName,
        input.lastName ?? null,
        input.phone,
      ],
    );
    return result.rows[0] ?? null;
  }

  async createAppointmentAccessToken(
    appointmentId: string,
    tokenHash: string,
  ): Promise<void> {
    await this.databaseService.query(
      `INSERT INTO appointment_access_tokens (appointment_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [appointmentId, tokenHash],
    );
  }

  async findAppointmentByAccessToken(tokenHash: string) {
    const r = await this.databaseService.query<{
      id: string;
      reference_code: string;
      status: string;
      start_at: Date;
      end_at: Date;
    }>(
      "SELECT a.id,a.reference_code,a.status,a.start_at,a.end_at FROM appointment_access_tokens t INNER JOIN appointments a ON a.id=t.appointment_id WHERE t.token_hash=$1 AND t.expires_at>NOW() AND t.revoked_at IS NULL LIMIT 1",
      [tokenHash],
    );
    return r.rows[0] ?? null;
  }

  async cancelAppointmentByAccessToken(tokenHash: string): Promise<boolean> {
    const result = await this.databaseService.query(
      `WITH valid AS (SELECT a.id FROM appointment_access_tokens t INNER JOIN appointments a ON a.id=t.appointment_id WHERE t.token_hash=$1 AND t.expires_at>NOW() AND t.revoked_at IS NULL AND a.status IN ('PENDING','CONFIRMED') FOR UPDATE), cancelled AS (UPDATE appointments SET status='CANCELLED', cancellation_actor='CLIENT', cancelled_at=NOW(), updated_at=NOW() WHERE id IN (SELECT id FROM valid) RETURNING id) UPDATE appointment_access_tokens SET revoked_at=NOW() WHERE appointment_id IN (SELECT id FROM cancelled)`,
      [tokenHash],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
