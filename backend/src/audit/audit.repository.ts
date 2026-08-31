import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { AuditEntry } from "./audit.service";
import type { ListAuditLogsDto } from "./dto/list-audit-logs.dto";

export interface AuditLogRecord {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: Date;
}

@Injectable()
export class AuditRepository {
  constructor(private readonly databaseService: DatabaseService) {}

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

  async create(entry: AuditEntry): Promise<void> {
    await this.databaseService.query(
      `INSERT INTO audit_logs
        (organization_id, business_id, actor_user_id, action, entity_type,
         entity_id, old_values, new_values)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
      [
        entry.organizationId,
        entry.businessId,
        entry.actorUserId,
        entry.action,
        entry.entityType,
        entry.entityId,
        JSON.stringify(entry.oldValues ?? {}),
        JSON.stringify(entry.newValues ?? {}),
      ],
    );
  }

  async listByBusiness(
    businessId: string,
    filters: ListAuditLogsDto,
  ): Promise<{ items: AuditLogRecord[]; total: string }> {
    const params = [
      businessId,
      filters.action ?? null,
      filters.entityType ?? null,
      filters.entityId ?? null,
      filters.actorUserId ?? null,
      filters.from ?? null,
      filters.to ?? null,
    ];
    const [itemsResult, totalResult] = await Promise.all([
      this.databaseService.query<AuditLogRecord>(
        `SELECT id, actor_user_id, action, entity_type, entity_id, old_values,
          new_values, created_at
        FROM audit_logs
        WHERE business_id = $1
          AND ($2::varchar IS NULL OR action = $2::varchar)
          AND ($3::varchar IS NULL OR entity_type = $3::varchar)
          AND ($4::uuid IS NULL OR entity_id = $4::uuid)
          AND ($5::uuid IS NULL OR actor_user_id = $5::uuid)
          AND ($6::timestamptz IS NULL OR created_at >= $6::timestamptz)
          AND ($7::timestamptz IS NULL OR created_at < $7::timestamptz)
        ORDER BY created_at DESC, id DESC
        LIMIT $8 OFFSET $9`,
        [...params, filters.limit ?? 50, filters.offset ?? 0],
      ),
      this.databaseService.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
        FROM audit_logs
        WHERE business_id = $1
          AND ($2::varchar IS NULL OR action = $2::varchar)
          AND ($3::varchar IS NULL OR entity_type = $3::varchar)
          AND ($4::uuid IS NULL OR entity_id = $4::uuid)
          AND ($5::uuid IS NULL OR actor_user_id = $5::uuid)
          AND ($6::timestamptz IS NULL OR created_at >= $6::timestamptz)
          AND ($7::timestamptz IS NULL OR created_at < $7::timestamptz)`,
        params,
      ),
    ]);
    return {
      items: itemsResult.rows,
      total: totalResult.rows[0]?.total ?? "0",
    };
  }
}
