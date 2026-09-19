import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import { DatabaseService } from "../database/database.service";
import type { EmployeeRecord } from "../employees/employees.repository";
import type { ListOrganizationMembersDto } from "./dto/list-organization-members.dto";

export interface MemberRecord {
  id: string;
  user_id: string;
  role: string;
  status: string;
  user_status: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
}

@Injectable()
export class OrganizationMembersRepository {
  constructor(private readonly database: DatabaseService) {}

  transaction<T>(operation: (client: PoolClient) => Promise<T>) {
    return this.database.transaction(operation);
  }

  async organization(client: PoolClient, id: string, lock = false) {
    const result = await client.query<{ status: string }>(
      `SELECT status FROM organizations WHERE id = $1 ${lock ? "FOR UPDATE" : ""}`,
      [id],
    );
    return result.rows[0];
  }

  async actor(client: PoolClient, organizationId: string, userId: string) {
    const result = await client.query<{
      role: string | null;
      is_superadmin: boolean;
    }>(
      `SELECT m.role, u.is_superadmin FROM users u
       LEFT JOIN organization_memberships m ON m.user_id = u.id
         AND m.organization_id = $1 AND m.status = 'ACTIVE'
       WHERE u.id = $2 AND u.status = 'ACTIVE'`,
      [organizationId, userId],
    );
    return result.rows[0];
  }

  async member(
    client: PoolClient,
    organizationId: string,
    id: string,
    byUser = false,
  ) {
    const result = await client.query<MemberRecord>(
      `SELECT m.id, m.user_id, m.role, m.status, u.status AS user_status,
         u.first_name, u.last_name, u.email, u.phone
       FROM organization_memberships m JOIN users u ON u.id = m.user_id
       WHERE m.organization_id = $1 AND ${byUser ? "m.user_id" : "m.id"} = $2`,
      [organizationId, id],
    );
    return result.rows[0];
  }

  async ownerMembershipIds(client: PoolClient, organizationId: string) {
    const result = await client.query<{ id: string }>(
      "SELECT id FROM organization_memberships WHERE organization_id = $1 AND role = 'OWNER' ORDER BY id",
      [organizationId],
    );
    return result.rows.map((row) => row.id);
  }

  async business(
    client: PoolClient,
    organizationId: string,
    businessId: string,
  ) {
    const result = await client.query<{ id: string; status: string }>(
      "SELECT id, status FROM businesses WHERE organization_id = $1 AND id = $2",
      [organizationId, businessId],
    );
    return result.rows[0];
  }

  async assignedBusinesses(
    client: PoolClient,
    organizationId: string,
    userId: string,
  ) {
    const result = await client.query<{ business_id: string }>(
      "SELECT business_id FROM business_memberships WHERE organization_id = $1 AND user_id = $2 ORDER BY business_id",
      [organizationId, userId],
    );
    return result.rows.map((row) => row.business_id);
  }

  async list(
    client: PoolClient,
    organizationId: string,
    filters: ListOrganizationMembersDto,
  ) {
    const params: unknown[] = [organizationId];
    const where = ["m.organization_id = $1"];
    if (filters.search?.trim()) {
      params.push(`%${filters.search.trim().replace(/[\\%_]/g, "\\$&")}%`);
      where.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length}
        OR u.email ILIKE $${params.length})`);
    }
    if (filters.role) {
      params.push(filters.role);
      where.push(`m.role = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`m.status = $${params.length}`);
    }
    if (filters.businessId) {
      params.push(filters.businessId);
      where.push(`m.status = 'ACTIVE' AND u.status = 'ACTIVE'
        AND EXISTS (SELECT 1 FROM organizations o WHERE o.id = m.organization_id AND o.status = 'ACTIVE')
        AND EXISTS (
        SELECT 1 FROM businesses b WHERE b.id = $${params.length} AND b.organization_id = m.organization_id
          AND b.status = 'ACTIVE' AND (m.role IN ('OWNER', 'ADMIN') OR EXISTS (
            SELECT 1 FROM business_memberships bm WHERE bm.business_id = b.id
              AND bm.organization_id = m.organization_id AND bm.user_id = m.user_id)))`);
    }
    const from = `FROM organization_memberships m JOIN users u ON u.id = m.user_id
      WHERE ${where.join(" AND ")}`;
    const total = await client.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total ${from}`,
      params,
    );
    const result = await client.query<MemberRecord & { businesses: unknown[] }>(
      `SELECT m.id, m.user_id, m.role, m.status, u.status AS user_status,
        u.first_name, u.last_name, u.email, u.phone,
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', b.id, 'name', b.name, 'slug', b.slug, 'status', b.status,
          'hasAccess', (m.status = 'ACTIVE' AND u.status = 'ACTIVE' AND b.status = 'ACTIVE'
            AND o.status = 'ACTIVE' AND (m.role IN ('OWNER', 'ADMIN') OR bm.user_id IS NOT NULL)),
          'explicitlyAssigned', bm.user_id IS NOT NULL,
          'employeeId', e.id, 'employeeIsActive', e.is_active,
          'attendsAppointments', COALESCE(e.is_active, FALSE)) ORDER BY b.name, b.id)
          FROM businesses b JOIN organizations o ON o.id = b.organization_id
          LEFT JOIN business_memberships bm ON bm.business_id = b.id
            AND bm.organization_id = m.organization_id AND bm.user_id = m.user_id
          LEFT JOIN employees e ON e.business_id = b.id
            AND e.organization_id = m.organization_id AND e.user_id = m.user_id
          WHERE b.organization_id = m.organization_id
            AND (m.role IN ('OWNER', 'ADMIN') OR bm.user_id IS NOT NULL OR e.id IS NOT NULL)), '[]'::jsonb) AS businesses
        ${from} ORDER BY u.first_name ASC NULLS LAST, u.last_name ASC NULLS LAST, m.id ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filters.limit ?? 50, filters.offset ?? 0],
    );
    return { items: result.rows, total: Number(total.rows[0].total) };
  }

  async changeRole(
    client: PoolClient,
    organizationId: string,
    member: MemberRecord,
    role: string,
    businessIds?: string[],
  ) {
    await client.query(
      "UPDATE organization_memberships SET role = $3, updated_at = NOW() WHERE organization_id = $1 AND id = $2",
      [organizationId, member.id, role],
    );
    if (businessIds !== undefined) {
      await client.query(
        "DELETE FROM business_memberships WHERE organization_id = $1 AND user_id = $2",
        [organizationId, member.user_id],
      );
      await client.query(
        `INSERT INTO business_memberships (organization_id, user_id, business_id)
        SELECT $1, $2, id FROM UNNEST($3::uuid[]) AS id`,
        [organizationId, member.user_id, businessIds],
      );
    }
  }

  async changeStatus(
    client: PoolClient,
    organizationId: string,
    membershipId: string,
    status: "ACTIVE" | "SUSPENDED",
  ) {
    await client.query(
      "UPDATE organization_memberships SET status=$3, updated_at=NOW() WHERE organization_id=$1 AND id=$2",
      [organizationId, membershipId, status],
    );
  }

  async replaceBusinesses(
    client: PoolClient,
    organizationId: string,
    userId: string,
    businessIds: string[],
  ) {
    await client.query(
      "DELETE FROM business_memberships WHERE organization_id=$1 AND user_id=$2",
      [organizationId, userId],
    );
    await client.query(
      `INSERT INTO business_memberships (organization_id, user_id, business_id)
      SELECT $1, $2, id FROM UNNEST($3::uuid[]) AS id`,
      [organizationId, userId, businessIds],
    );
  }

  async employee(
    client: PoolClient,
    organizationId: string,
    businessId: string,
    userId: string,
  ) {
    const result = await client.query<{ id: string; is_active: boolean }>(
      "SELECT id, is_active FROM employees WHERE organization_id = $1 AND business_id = $2 AND user_id = $3",
      [organizationId, businessId, userId],
    );
    return result.rows[0];
  }

  async capacity(client: PoolClient, organizationId: string) {
    const result = await client.query<{
      count: string;
      maximum: number | null;
    }>(
      `SELECT (SELECT COUNT(*)::text FROM employees WHERE organization_id = $1 AND is_active = TRUE) AS count,
        (SELECT p.max_employees FROM organization_subscriptions s JOIN plans p ON p.code = s.plan_code
         WHERE s.organization_id = $1 AND s.status IN ('ACTIVE', 'TRIAL', 'SUSPENDED')
         ORDER BY s.created_at DESC LIMIT 1) AS maximum`,
      [organizationId],
    );
    return result.rows[0];
  }

  async createEmployee(
    client: PoolClient,
    organizationId: string,
    businessId: string,
    member: MemberRecord,
    input: { color?: string; notes?: string },
  ) {
    const result = await client.query<EmployeeRecord>(
      `INSERT INTO employees (organization_id, business_id, user_id, first_name, last_name, email, phone, color, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, organization_id, business_id, user_id, first_name, last_name, email, phone, color, notes,
         is_active, created_at, updated_at, archived_at`,
      [
        organizationId,
        businessId,
        member.user_id,
        member.first_name,
        member.last_name,
        member.email,
        member.phone,
        input.color?.trim().toUpperCase() ?? null,
        input.notes?.trim() ?? null,
      ],
    );
    return result.rows[0];
  }

  async audit(
    client: PoolClient,
    organizationId: string,
    actorUserId: string,
    platform: boolean,
    action: string,
    entityType: string,
    entityId: string,
    oldValues: unknown,
    newValues: unknown,
    businessId?: string,
  ) {
    await client.query(
      `INSERT INTO audit_logs (organization_id, business_id, actor_user_id, action, entity_type, entity_id, old_values, new_values)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        organizationId,
        businessId ?? null,
        actorUserId,
        action,
        entityType,
        entityId,
        JSON.stringify(oldValues),
        JSON.stringify(newValues),
      ],
    );
    if (platform) {
      await client.query(
        `INSERT INTO platform_audit_logs (actor_user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          actorUserId,
          action,
          entityType.toLowerCase(),
          entityId,
          JSON.stringify(oldValues),
          JSON.stringify({ organizationId, ...(newValues as object) }),
        ],
      );
    }
  }
}
