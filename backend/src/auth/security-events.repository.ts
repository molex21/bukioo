import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface SecurityEventInput {
  eventType: string;
  outcome: "SUCCESS" | "FAILURE";
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

@Injectable()
export class SecurityEventsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async record(input: SecurityEventInput): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `DELETE FROM security_event_logs
        WHERE created_at < NOW() - INTERVAL '12 months'`,
      );
      await client.query(
        `INSERT INTO security_event_logs
          (user_id, event_type, outcome, ip_address, user_agent, metadata)
        VALUES ($1, $2, $3, $4::inet, $5, $6::jsonb)`,
        [
          input.userId ?? null,
          input.eventType,
          input.outcome,
          input.ipAddress ?? null,
          input.userAgent?.slice(0, 512) ?? null,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
    });
  }
}
