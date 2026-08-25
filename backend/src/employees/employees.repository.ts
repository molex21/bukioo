import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { CreateEmployeeDto } from "./dto/create-employee.dto";
import type { UpdateEmployeeDto } from "./dto/update-employee.dto";

export interface EmployeeRecord {
  id: string;
  organization_id: string;
  business_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  color: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

@Injectable()
export class EmployeesRepository {
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
    createEmployeeDto: CreateEmployeeDto,
  ): Promise<EmployeeRecord> {
    const result = await this.databaseService.query<EmployeeRecord>(
      `INSERT INTO employees
        (organization_id, business_id, first_name, last_name, email, phone, color, notes)
      SELECT organization_id, id, $2, $3, $4, $5, $6, $7
      FROM businesses
      WHERE id = $1
      RETURNING id, organization_id, business_id, user_id, first_name, last_name,
        email, phone, color, is_active, notes, created_at, updated_at, archived_at`,
      [
        businessId,
        createEmployeeDto.firstName,
        createEmployeeDto.lastName,
        createEmployeeDto.email ?? null,
        createEmployeeDto.phone ?? null,
        createEmployeeDto.color ?? null,
        createEmployeeDto.notes ?? null,
      ],
    );

    return result.rows[0];
  }

  async findActiveBusinessOrganizationId(
    businessId: string,
  ): Promise<string | null> {
    const result = await this.databaseService.query<{
      organization_id: string;
    }>(
      `SELECT organization_id
      FROM businesses
      WHERE id = $1
        AND status = 'ACTIVE'
      LIMIT 1`,
      [businessId],
    );

    return result.rows[0]?.organization_id ?? null;
  }

  async listByBusiness(businessId: string): Promise<EmployeeRecord[]> {
    const result = await this.databaseService.query<EmployeeRecord>(
      `SELECT id, organization_id, business_id, user_id, first_name, last_name,
        email, phone, color, is_active, notes, created_at, updated_at, archived_at
      FROM employees
      WHERE business_id = $1
        AND is_active = TRUE
      ORDER BY first_name ASC, last_name ASC, created_at ASC`,
      [businessId],
    );

    return result.rows;
  }

  async findActiveById(
    businessId: string,
    employeeId: string,
  ): Promise<EmployeeRecord | null> {
    const result = await this.databaseService.query<EmployeeRecord>(
      `SELECT id, organization_id, business_id, user_id, first_name, last_name,
        email, phone, color, is_active, notes, created_at, updated_at, archived_at
      FROM employees
      WHERE id = $1
        AND business_id = $2
        AND is_active = TRUE
      LIMIT 1`,
      [employeeId, businessId],
    );

    return result.rows[0] ?? null;
  }

  async update(
    employee: EmployeeRecord,
    updateEmployeeDto: UpdateEmployeeDto,
  ): Promise<EmployeeRecord> {
    const result = await this.databaseService.query<EmployeeRecord>(
      `UPDATE employees
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          email = COALESCE($3, email),
          phone = COALESCE($4, phone),
          color = COALESCE($5, color),
          notes = COALESCE($6, notes),
          updated_at = NOW()
      WHERE id = $7
        AND business_id = $8
        AND organization_id = $9
        AND is_active = TRUE
      RETURNING id, organization_id, business_id, user_id, first_name, last_name,
        email, phone, color, is_active, notes, created_at, updated_at, archived_at`,
      [
        updateEmployeeDto.firstName,
        updateEmployeeDto.lastName,
        updateEmployeeDto.email,
        updateEmployeeDto.phone,
        updateEmployeeDto.color,
        updateEmployeeDto.notes,
        employee.id,
        employee.business_id,
        employee.organization_id,
      ],
    );

    return result.rows[0];
  }

  async archive(employee: EmployeeRecord): Promise<boolean> {
    const result = await this.databaseService.query(
      `UPDATE employees
      SET is_active = FALSE,
          archived_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND business_id = $2
        AND organization_id = $3
        AND is_active = TRUE`,
      [employee.id, employee.business_id, employee.organization_id],
    );

    return (result.rowCount ?? 0) === 1;
  }
}
