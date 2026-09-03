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

export interface CreateEmployeeInviteInput
  extends CreateEmployeeRegistrationInput {
  employee: {
    businessId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    color?: string;
    notes?: string;
  };
}

export interface EmployeeInviteRecord {
  id: string;
  organization_id: string;
  business_id: string;
  user_id: string;
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

export interface InviteExistingEmployeeInput {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  organizationId: string;
  businessId: string;
  employeeId: string;
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
        RETURNING id, email, first_name, last_name, password_hash, password_change_required,
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

  async createWithEmployee(
    input: CreateEmployeeInviteInput,
  ): Promise<{ user: UserRecord; employee: EmployeeInviteRecord }> {
    return this.databaseService.transaction(async (client) => {
      const userResult = await client.query<UserRecord>(
        `INSERT INTO users
          (email, first_name, last_name, password_hash, password_change_required)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING id, email, first_name, last_name, password_hash, password_change_required,
          email_verified_at, preferred_locale, is_superadmin, status,
          created_at, updated_at`,
        [
          input.email,
          input.employee.firstName,
          input.employee.lastName,
          input.passwordHash,
        ],
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
      const employeeResult = await client.query<EmployeeInviteRecord>(
        `INSERT INTO employees
          (organization_id, business_id, user_id, first_name, last_name, email, phone, color, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, organization_id, business_id, user_id, first_name, last_name,
          email, phone, color, is_active, notes, created_at, updated_at, archived_at`,
        [
          input.organizationId,
          input.employee.businessId,
          user.id,
          input.employee.firstName,
          input.employee.lastName,
          input.employee.email,
          input.employee.phone ?? null,
          input.employee.color ?? null,
          input.employee.notes ?? null,
        ],
      );

      return { user, employee: employeeResult.rows[0] };
    });
  }

  async inviteExistingEmployee(
    input: InviteExistingEmployeeInput,
  ): Promise<EmployeeInviteRecord> {
    return this.databaseService.transaction(async (client) => {
      const userResult = await client.query<UserRecord>(
        `INSERT INTO users
          (email, first_name, last_name, password_hash, password_change_required)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING id, email, first_name, last_name, password_hash, password_change_required,
          email_verified_at, preferred_locale, is_superadmin, status,
          created_at, updated_at`,
        [input.email, input.firstName, input.lastName, input.passwordHash],
      );
      const user = userResult.rows[0];

      await client.query(
        `INSERT INTO organization_memberships (organization_id, user_id, role)
        VALUES ($1, $2, 'EMPLOYEE')`,
        [input.organizationId, user.id],
      );
      await client.query(
        `INSERT INTO business_memberships (business_id, user_id, organization_id)
        VALUES ($1, $2, $3)`,
        [input.businessId, user.id, input.organizationId],
      );
      const employeeResult = await client.query<EmployeeInviteRecord>(
        `UPDATE employees
        SET user_id = $1,
            updated_at = NOW()
        WHERE id = $2
          AND organization_id = $3
          AND business_id = $4
          AND user_id IS NULL
          AND is_active = TRUE
        RETURNING id, organization_id, business_id, user_id, first_name, last_name,
          email, phone, color, is_active, notes, created_at, updated_at, archived_at`,
        [user.id, input.employeeId, input.organizationId, input.businessId],
      );

      const employee = employeeResult.rows[0];

      if (!employee) {
        throw new Error("Employee invitation could not be completed");
      }

      return employee;
    });
  }
}
