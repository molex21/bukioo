import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { ListAuditLogsDto } from "./dto/list-audit-logs.dto";

export interface AuditEntry {
  organizationId: string;
  businessId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}
@Injectable()
export class AuditService {
  constructor(private readonly databaseService: DatabaseService) {}
  async record(entry: AuditEntry): Promise<void> {
    await this.databaseService.query(
      `INSERT INTO audit_logs (organization_id,business_id,actor_user_id,action,entity_type,entity_id,old_values,new_values) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`,
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
  async list(businessId: string, filters: ListAuditLogsDto, userId: string) {
    if (
      filters.from &&
      filters.to &&
      new Date(filters.from) >= new Date(filters.to)
    )
      throw new BadRequestException(
        "La fecha from debe ser anterior a la fecha to",
      );
    const access = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM businesses INNER JOIN organization_memberships m ON m.organization_id=businesses.organization_id INNER JOIN users ON users.id=m.user_id WHERE businesses.id=$1 AND m.user_id=$2 AND m.status='ACTIVE' AND m.role IN ('OWNER','ADMIN') AND users.status='ACTIVE') AS exists`,
      [businessId, userId],
    );
    if (!access.rows[0]?.exists)
      throw new ForbiddenException(
        "No tienes permiso para consultar la auditoria",
      );
    const result = await this.databaseService.query(
      `SELECT id,actor_user_id,action,entity_type,entity_id,old_values,new_values,created_at FROM audit_logs WHERE business_id=$1 AND ($2::varchar IS NULL OR action=$2) AND ($3::varchar IS NULL OR entity_type=$3) AND ($4::uuid IS NULL OR entity_id=$4) AND ($5::timestamptz IS NULL OR created_at >= $5) AND ($6::timestamptz IS NULL OR created_at < $6) ORDER BY created_at DESC`,
      [
        businessId,
        filters.action ?? null,
        filters.entityType ?? null,
        filters.entityId ?? null,
        filters.from ?? null,
        filters.to ?? null,
      ],
    );
    return result.rows;
  }
}
