import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface CreateUserSessionInput {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

export interface UserSessionRecord {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  expires_at: Date;
  user_status: string;
  user_email_verified_at: Date | null;
  user_password_change_required: boolean;
}

export interface RotateUserSessionInput {
  id: string;
  userId: string;
  refreshTokenHash: string;
}

@Injectable()
export class UserSessionsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(input: CreateUserSessionInput): Promise<void> {
    await this.databaseService.query(
      `INSERT INTO user_sessions (
        id,
        user_id,
        refresh_token_hash,
        user_agent,
        ip_address,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.id,
        input.userId,
        input.refreshTokenHash,
        input.userAgent ?? null,
        input.ipAddress ?? null,
        input.expiresAt,
      ],
    );
  }

  async findActiveById(id: string): Promise<UserSessionRecord | null> {
    const result = await this.databaseService.query<UserSessionRecord>(
      `SELECT
        user_sessions.id,
        user_sessions.user_id,
        user_sessions.refresh_token_hash,
        user_sessions.expires_at,
        users.status AS user_status,
        users.email_verified_at AS user_email_verified_at,
        users.password_change_required AS user_password_change_required
      FROM user_sessions
      INNER JOIN users ON users.id = user_sessions.user_id
      WHERE user_sessions.id = $1
        AND user_sessions.revoked_at IS NULL
        AND user_sessions.expires_at > NOW()`,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async rotate(input: RotateUserSessionInput): Promise<boolean> {
    const result = await this.databaseService.query(
      `UPDATE user_sessions
      SET refresh_token_hash = $1,
          last_used_at = NOW()
      WHERE id = $2
        AND user_id = $3
        AND revoked_at IS NULL
        AND expires_at > NOW()`,
      [input.refreshTokenHash, input.id, input.userId],
    );

    return result.rowCount === 1;
  }

  async revoke(id: string, userId: string): Promise<void> {
    await this.databaseService.query(
      `UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND revoked_at IS NULL`,
      [id, userId],
    );
  }
}
