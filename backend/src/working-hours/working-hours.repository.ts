import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { WorkingHourDto } from "./dto/replace-working-hours.dto";

export interface EmployeeWorkingHourRecord {
  id: string;
  organization_id: string;
  business_id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  valid_from: string | null;
  valid_to: string | null;
}

export interface ActiveEmployeeRecord {
  id: string;
  organization_id: string;
  business_id: string;
}

@Injectable()
export class WorkingHoursRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async canAccessBusiness(
    userId: string,
    businessId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM businesses
        INNER JOIN organization_memberships ON organization_memberships.organization_id = businesses.organization_id
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
        INNER JOIN organization_memberships ON organization_memberships.organization_id = businesses.organization_id
        INNER JOIN users ON users.id = organization_memberships.user_id
        WHERE businesses.id = $1 AND businesses.status = 'ACTIVE'
          AND organization_memberships.user_id = $2
          AND organization_memberships.status = 'ACTIVE'
          AND organization_memberships.role IN ('OWNER', 'ADMIN') AND users.status = 'ACTIVE'
      ) AS exists`,
      [businessId, userId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async findActiveEmployee(
    businessId: string,
    employeeId: string,
  ): Promise<ActiveEmployeeRecord | null> {
    const result = await this.databaseService.query<ActiveEmployeeRecord>(
      `SELECT id, organization_id, business_id FROM employees
      WHERE id = $1 AND business_id = $2 AND is_active = TRUE LIMIT 1`,
      [employeeId, businessId],
    );
    return result.rows[0] ?? null;
  }

  async list(
    employee: ActiveEmployeeRecord,
  ): Promise<EmployeeWorkingHourRecord[]> {
    const result = await this.databaseService.query<EmployeeWorkingHourRecord>(
      `SELECT id, organization_id, business_id, employee_id, day_of_week,
        start_time::text, end_time::text, valid_from::text, valid_to::text
      FROM employee_working_hours
      WHERE employee_id = $1 AND business_id = $2 AND organization_id = $3
      ORDER BY day_of_week ASC, start_time ASC`,
      [employee.id, employee.business_id, employee.organization_id],
    );
    return result.rows;
  }

  async replace(
    employee: ActiveEmployeeRecord,
    hours: WorkingHourDto[],
  ): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `DELETE FROM employee_working_hours
        WHERE employee_id = $1 AND business_id = $2 AND organization_id = $3`,
        [employee.id, employee.business_id, employee.organization_id],
      );
      for (const hour of hours) {
        await client.query(
          `INSERT INTO employee_working_hours
            (organization_id, business_id, employee_id, day_of_week, start_time, end_time)
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            employee.organization_id,
            employee.business_id,
            employee.id,
            hour.dayOfWeek,
            hour.startTime,
            hour.endTime,
          ],
        );
      }
    });
  }
}
