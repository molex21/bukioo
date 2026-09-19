import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PoolClient } from "pg";
import { DatabaseService } from "../database/database.service";
import type { EmployeeRecord } from "../employees/employees.repository";
import type { UpdatePlatformEmployeeDto } from "./dto/update-platform-employee.dto";

@Injectable()
export class PlatformEmployeesService {
  constructor(private readonly database: DatabaseService) {}

  private async context(
    client: PoolClient,
    organizationId: string,
    businessId: string,
    userId: string,
    mutation: boolean,
  ) {
    const actor = await client.query(
      "SELECT id FROM users WHERE id=$1 AND is_superadmin=TRUE AND status='ACTIVE'",
      [userId],
    );
    if (!actor.rows.length)
      throw new ForbiddenException(
        "No tienes permiso para gestionar empleados de plataforma",
      );
    // Same organization lock used by member linking to serialize capacity checks.
    const organization = await client.query<{ status: string }>(
      `SELECT status FROM organizations WHERE id=$1 ${mutation ? "FOR UPDATE" : ""}`,
      [organizationId],
    );
    if (!organization.rows[0])
      throw new NotFoundException("Organización no disponible");
    const business = await client.query<{ status: string }>(
      "SELECT status FROM businesses WHERE organization_id=$1 AND id=$2",
      [organizationId, businessId],
    );
    if (!business.rows[0])
      throw new NotFoundException("Empresa no disponible en esta organización");
    if (
      mutation &&
      (organization.rows[0].status !== "ACTIVE" ||
        business.rows[0].status !== "ACTIVE")
    )
      throw new ConflictException(
        "La organización y la empresa deben estar activas para editar empleados",
      );
  }

  private async employee(
    client: PoolClient,
    organizationId: string,
    businessId: string,
    employeeId: string,
    lock: boolean,
  ) {
    const result = await client.query<EmployeeRecord>(
      `SELECT id, organization_id, business_id, user_id, first_name, last_name,
      email, phone, color, notes, is_active, created_at, updated_at, archived_at
      FROM employees WHERE organization_id=$1 AND business_id=$2 AND id=$3 ${lock ? "FOR UPDATE" : ""}`,
      [organizationId, businessId, employeeId],
    );
    if (!result.rows[0])
      throw new NotFoundException("Empleado no disponible en esta empresa");
    return result.rows[0];
  }

  private response(employee: EmployeeRecord) {
    return {
      id: employee.id,
      organizationId: employee.organization_id,
      businessId: employee.business_id,
      userId: employee.user_id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      color: employee.color,
      notes: employee.notes,
      isActive: employee.is_active,
      createdAt: employee.created_at,
      updatedAt: employee.updated_at,
      archivedAt: employee.archived_at,
    };
  }

  async get(
    organizationId: string,
    businessId: string,
    employeeId: string,
    actorUserId: string,
  ) {
    return this.database.transaction(async (client) => {
      await this.context(
        client,
        organizationId,
        businessId,
        actorUserId,
        false,
      );
      return this.response(
        await this.employee(
          client,
          organizationId,
          businessId,
          employeeId,
          false,
        ),
      );
    });
  }

  async update(
    organizationId: string,
    businessId: string,
    employeeId: string,
    input: UpdatePlatformEmployeeDto,
    actorUserId: string,
  ) {
    return this.database.transaction(async (client) => {
      await this.context(client, organizationId, businessId, actorUserId, true);
      const previous = await this.employee(
        client,
        organizationId,
        businessId,
        employeeId,
        true,
      );
      if (
        new Date(previous.updated_at).getTime() !==
        new Date(input.expectedUpdatedAt).getTime()
      )
        throw new ConflictException(
          "Otro usuario ha modificado este empleado. Actualiza sus datos antes de guardar",
        );
      if (
        (input.firstName !== undefined && !input.firstName.trim()) ||
        (input.lastName !== undefined && !input.lastName.trim())
      )
        throw new BadRequestException(
          "El nombre y los apellidos no pueden estar vacíos",
        );
      if (input.isActive === true && !previous.is_active) {
        const capacity = await client.query<{
          count: string;
          maximum: number | null;
        }>(
          `SELECT
          (SELECT COUNT(*)::text FROM employees WHERE organization_id=$1 AND is_active=TRUE) AS count,
          (SELECT p.max_employees FROM organization_subscriptions s JOIN plans p ON p.code=s.plan_code
           WHERE s.organization_id=$1 AND s.status IN ('ACTIVE','TRIAL','SUSPENDED')
           ORDER BY s.created_at DESC LIMIT 1) AS maximum`,
          [organizationId],
        );
        const current = capacity.rows[0];
        if (
          current.maximum !== null &&
          Number(current.count) >= current.maximum
        )
          throw new ConflictException(
            `El plan permite hasta ${current.maximum} empleados activos`,
          );
      }
      const next = {
        firstName: input.firstName?.trim() ?? previous.first_name,
        lastName: input.lastName?.trim() ?? previous.last_name,
        email:
          input.email === undefined
            ? previous.email
            : input.email?.trim().toLowerCase() || null,
        phone:
          input.phone === undefined
            ? previous.phone
            : input.phone?.trim() || null,
        color:
          input.color === undefined
            ? previous.color
            : input.color?.toUpperCase() || null,
        notes:
          input.notes === undefined
            ? previous.notes
            : input.notes?.trim() || null,
        isActive: input.isActive ?? previous.is_active,
      };
      const result = await client.query<EmployeeRecord>(
        `UPDATE employees SET first_name=$4, last_name=$5, email=$6, phone=$7, color=$8, notes=$9,
        archived_at=CASE WHEN $10::boolean THEN NULL WHEN is_active THEN NOW() ELSE archived_at END,
        is_active=$10, updated_at=GREATEST(clock_timestamp(), updated_at + INTERVAL '1 millisecond')
        WHERE organization_id=$1 AND business_id=$2 AND id=$3
        RETURNING id, organization_id, business_id, user_id, first_name, last_name, email, phone, color, notes, is_active, created_at, updated_at, archived_at`,
        [
          organizationId,
          businessId,
          employeeId,
          next.firstName,
          next.lastName,
          next.email,
          next.phone,
          next.color,
          next.notes,
          next.isActive,
        ],
      );
      const updated = this.response(result.rows[0]);
      const action =
        previous.is_active === next.isActive
          ? "EMPLOYEE_UPDATED"
          : next.isActive
            ? "EMPLOYEE_REACTIVATED"
            : "EMPLOYEE_ARCHIVED";
      const oldValues = JSON.stringify(this.response(previous));
      const newValues = JSON.stringify(updated);
      await client.query(
        `INSERT INTO audit_logs (organization_id,business_id,actor_user_id,action,entity_type,entity_id,old_values,new_values)
        VALUES ($1,$2,$3,$4,'EMPLOYEE',$5,$6,$7)`,
        [
          organizationId,
          businessId,
          actorUserId,
          action,
          employeeId,
          oldValues,
          newValues,
        ],
      );
      await client.query(
        `INSERT INTO platform_audit_logs (actor_user_id,action,entity_type,entity_id,old_values,new_values)
        VALUES ($1,$2,'employee',$3,$4,$5)`,
        [actorUserId, action, employeeId, oldValues, newValues],
      );
      return updated;
    });
  }
}
