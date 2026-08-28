import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface TwoFactorState {
  secret_encrypted: string | null;
  enabled: boolean;
}

interface RecoveryCodeRecord {
  id: string;
  code_hash: string;
}

@Injectable()
export class TwoFactorRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findState(userId: string): Promise<TwoFactorState | null> {
    const result = await this.databaseService.query<TwoFactorState>(
      `SELECT user_two_factor.secret_encrypted,
        COALESCE(user_two_factor.enabled, FALSE) AS enabled
      FROM users
      LEFT JOIN user_two_factor ON user_two_factor.user_id = users.id
      WHERE users.id = $1`,
      [userId],
    );

    return result.rows[0] ?? null;
  }

  async replacePendingSecret(
    userId: string,
    secretEncrypted: string,
  ): Promise<void> {
    await this.databaseService.query(
      `INSERT INTO user_two_factor (user_id, secret_encrypted, enabled, enabled_at)
      VALUES ($1, $2, FALSE, NULL)
      ON CONFLICT (user_id) DO UPDATE
      SET secret_encrypted = EXCLUDED.secret_encrypted,
          enabled = FALSE,
          enabled_at = NULL`,
      [userId, secretEncrypted],
    );
  }

  async enable(userId: string, recoveryCodeHashes: string[]): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `UPDATE user_two_factor
        SET enabled = TRUE,
            enabled_at = NOW()
        WHERE user_id = $1
          AND enabled = FALSE`,
        [userId],
      );
      await client.query("DELETE FROM user_recovery_codes WHERE user_id = $1", [
        userId,
      ]);
      for (const codeHash of recoveryCodeHashes) {
        await client.query(
          "INSERT INTO user_recovery_codes (user_id, code_hash) VALUES ($1, $2)",
          [userId, codeHash],
        );
      }
    });
  }

  async findUnusedRecoveryCodes(userId: string): Promise<RecoveryCodeRecord[]> {
    const result = await this.databaseService.query<RecoveryCodeRecord>(
      `SELECT id, code_hash
      FROM user_recovery_codes
      WHERE user_id = $1
        AND used_at IS NULL`,
      [userId],
    );

    return result.rows;
  }

  async consumeRecoveryCode(id: string, userId: string): Promise<boolean> {
    const result = await this.databaseService.query(
      `UPDATE user_recovery_codes
      SET used_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND used_at IS NULL`,
      [id, userId],
    );

    return (result.rowCount ?? 0) === 1;
  }

  async reset(userId: string): Promise<boolean> {
    return this.databaseService.transaction(async (client) => {
      const result = await client.query(
        `DELETE FROM user_two_factor
        WHERE user_id = $1
          AND enabled = TRUE`,
        [userId],
      );

      if ((result.rowCount ?? 0) !== 1) {
        return false;
      }

      await client.query("DELETE FROM user_recovery_codes WHERE user_id = $1", [
        userId,
      ]);
      await client.query(
        `UPDATE user_sessions
        SET revoked_at = NOW()
        WHERE user_id = $1
          AND revoked_at IS NULL`,
        [userId],
      );

      return true;
    });
  }
}
