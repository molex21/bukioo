import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import {
  LOGIN_LOCK_DURATION_SECONDS,
  MAX_CONSECUTIVE_LOGIN_FAILURES,
} from "./auth.constants";

@Injectable()
export class LoginProtectionRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async isUserLocked(userId: string): Promise<boolean> {
    return this.isLocked("user_login_attempts", "user_id", userId);
  }

  async getUserLockRemainingSeconds(userId: string): Promise<number> {
    const result = await this.databaseService.query<{ seconds: number }>(
      `SELECT GREATEST(0, CEIL(EXTRACT(EPOCH FROM locked_until - NOW())))::int AS seconds
      FROM user_login_attempts
      WHERE user_id = $1 AND locked_until > NOW()`,
      [userId],
    );
    return Number(result.rows[0]?.seconds ?? 0);
  }

  async isCustomerAccountLocked(customerAccountId: string): Promise<boolean> {
    return this.isLocked(
      "customer_account_login_attempts",
      "customer_account_id",
      customerAccountId,
    );
  }

  async recordUserFailure(userId: string): Promise<void> {
    await this.recordFailure("user_login_attempts", "user_id", userId);
  }

  async recordCustomerAccountFailure(customerAccountId: string): Promise<void> {
    await this.recordFailure(
      "customer_account_login_attempts",
      "customer_account_id",
      customerAccountId,
    );
  }

  async clearUserFailures(userId: string): Promise<void> {
    await this.clearFailures("user_login_attempts", "user_id", userId);
  }

  async clearCustomerAccountFailures(customerAccountId: string): Promise<void> {
    await this.clearFailures(
      "customer_account_login_attempts",
      "customer_account_id",
      customerAccountId,
    );
  }

  private async isLocked(table: string, idColumn: string, id: string) {
    const result = await this.databaseService.query<{ locked: boolean }>(
      `SELECT locked_until > NOW() AS locked FROM ${table} WHERE ${idColumn} = $1`,
      [id],
    );
    return result.rows[0]?.locked === true;
  }

  private async recordFailure(table: string, idColumn: string, id: string) {
    await this.databaseService.query(
      `INSERT INTO ${table} (${idColumn}, failed_attempts, last_failed_at)
      VALUES ($1, 1, NOW())
      ON CONFLICT (${idColumn}) DO UPDATE
      SET failed_attempts = CASE
            WHEN ${table}.locked_until IS NOT NULL AND ${table}.locked_until <= NOW() THEN 1
            ELSE ${table}.failed_attempts + 1
          END,
          last_failed_at = NOW(),
          locked_until = CASE
            WHEN (CASE
              WHEN ${table}.locked_until IS NOT NULL AND ${table}.locked_until <= NOW() THEN 1
              ELSE ${table}.failed_attempts + 1
            END) >= $2 THEN NOW() + ($3 * INTERVAL '1 second')
            ELSE NULL
          END`,
      [id, MAX_CONSECUTIVE_LOGIN_FAILURES, LOGIN_LOCK_DURATION_SECONDS],
    );
  }

  private async clearFailures(table: string, idColumn: string, id: string) {
    await this.databaseService.query(
      `DELETE FROM ${table} WHERE ${idColumn} = $1`,
      [id],
    );
  }
}
