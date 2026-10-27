import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { PoolClient } from "pg";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class SchedulingRepository {
  constructor(readonly database: DatabaseService) {}
  async authorize(client: PoolClient, businessId: string, userId: string) {
    const result = await client.query<{
      organization_id: string;
      timezone: string;
    }>(
      `SELECT b.organization_id,b.timezone FROM businesses b
       JOIN organization_memberships m ON m.organization_id=b.organization_id
       JOIN organizations o ON o.id=b.organization_id JOIN users u ON u.id=m.user_id
       WHERE b.id=$1 AND b.status='ACTIVE' AND o.status='ACTIVE' AND m.user_id=$2
       AND m.status='ACTIVE' AND u.status='ACTIVE' AND m.role IN ('OWNER','ADMIN')`,
      [businessId, userId],
    );
    if (!result.rows[0])
      throw new ForbiddenException(
        "No tienes permiso para gestionar este cuadrante.",
      );
    return result.rows[0];
  }
  async lock(
    client: PoolClient,
    businessId: string,
    organizationId: string,
    ids: string[],
  ) {
    const result = await client.query<{ id: string }>(
      `SELECT id FROM employees WHERE id=ANY($1::uuid[])
      AND business_id=$2 AND organization_id=$3 AND is_active=TRUE AND archived_at IS NULL ORDER BY id FOR UPDATE`,
      [ids, businessId, organizationId],
    );
    if (result.rows.length !== ids.length)
      throw new NotFoundException(
        "Algún empleado no está activo en esta empresa.",
      );
    return (
      await client.query<{ employee_id: string; version: number }>(
        `SELECT e.id AS employee_id,coalesce(v.version,0) AS version FROM employees e
         LEFT JOIN employee_schedule_versions v ON v.employee_id=e.id AND v.business_id=e.business_id AND v.organization_id=e.organization_id
         WHERE e.id=ANY($1::uuid[]) AND e.business_id=$2 AND e.organization_id=$3`,
        [ids, businessId, organizationId],
      )
    ).rows;
  }
}
