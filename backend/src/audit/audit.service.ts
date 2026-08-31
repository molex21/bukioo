import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { AuditRepository } from "./audit.repository";
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
  constructor(private readonly auditRepository: AuditRepository) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.auditRepository.create(entry);
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
    if (!(await this.auditRepository.canManageBusiness(userId, businessId)))
      throw new ForbiddenException(
        "No tienes permiso para consultar la auditoria",
      );
    const result = await this.auditRepository.listByBusiness(
      businessId,
      filters,
    );
    return {
      pagination: {
        limit: filters.limit ?? 50,
        offset: filters.offset ?? 0,
        total: Number(result.total),
      },
      items: result.items.map((item) => ({
        id: item.id,
        actorUserId: item.actor_user_id,
        action: item.action,
        entityType: item.entity_type,
        entityId: item.entity_id,
        oldValues: item.old_values,
        newValues: item.new_values,
        createdAt: item.created_at,
      })),
    };
  }
}
