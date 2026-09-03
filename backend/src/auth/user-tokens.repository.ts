import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

const EMAIL_VERIFICATION_TOKEN_TYPE = "EMAIL_VERIFICATION";
const PASSWORD_RESET_TOKEN_TYPE = "PASSWORD_RESET";

export interface CreateEmailVerificationTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface VerifyInitialEmailInput {
  tokenHash: string;
  userId: string;
}

export interface CompleteInitialPasswordInput {
  userId: string;
  passwordHash: string;
}

export interface ConsumePasswordResetTokenInput {
  tokenHash: string;
  passwordHash: string;
}

interface EmailVerificationTokenRecord {
  id: string;
  user_id: string;
}

@Injectable()
export class UserTokensRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async replaceEmailVerificationToken(
    input: CreateEmailVerificationTokenInput,
  ): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `UPDATE user_tokens
        SET used_at = NOW()
        WHERE user_id = $1
          AND type = $2
          AND used_at IS NULL`,
        [input.userId, EMAIL_VERIFICATION_TOKEN_TYPE],
      );
      await client.query(
        `INSERT INTO user_tokens (user_id, type, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)`,
        [
          input.userId,
          EMAIL_VERIFICATION_TOKEN_TYPE,
          input.tokenHash,
          input.expiresAt,
        ],
      );
    });
  }

  async consumeEmailVerificationToken(tokenHash: string): Promise<boolean> {
    return this.databaseService.transaction(async (client) => {
      const tokenResult = await client.query<EmailVerificationTokenRecord>(
        `SELECT user_tokens.id, user_tokens.user_id
        FROM user_tokens
        INNER JOIN users ON users.id = user_tokens.user_id
        WHERE type = $1
          AND token_hash = $2
          AND used_at IS NULL
          AND expires_at > NOW()
          AND users.password_change_required = FALSE
        FOR UPDATE`,
        [EMAIL_VERIFICATION_TOKEN_TYPE, tokenHash],
      );
      const token = tokenResult.rows[0];

      if (!token) {
        return false;
      }

      await client.query(
        "UPDATE user_tokens SET used_at = NOW() WHERE id = $1",
        [token.id],
      );
      await client.query(
        `UPDATE users
        SET email_verified_at = COALESCE(email_verified_at, NOW()),
            updated_at = NOW()
        WHERE id = $1`,
        [token.user_id],
      );

      return true;
    });
  }

  async replacePasswordResetToken(
    input: CreateEmailVerificationTokenInput,
  ): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `UPDATE user_tokens
        SET used_at = NOW()
        WHERE user_id = $1
          AND type = $2
          AND used_at IS NULL`,
        [input.userId, PASSWORD_RESET_TOKEN_TYPE],
      );
      await client.query(
        `INSERT INTO user_tokens (user_id, type, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)`,
        [
          input.userId,
          PASSWORD_RESET_TOKEN_TYPE,
          input.tokenHash,
          input.expiresAt,
        ],
      );
    });
  }

  async consumePasswordResetToken(
    input: ConsumePasswordResetTokenInput,
  ): Promise<boolean> {
    return this.databaseService.transaction(async (client) => {
      const tokenResult = await client.query<EmailVerificationTokenRecord>(
        `SELECT user_tokens.id, user_tokens.user_id
        FROM user_tokens
        INNER JOIN users ON users.id = user_tokens.user_id
        WHERE user_tokens.type = $1
          AND user_tokens.token_hash = $2
          AND user_tokens.used_at IS NULL
          AND user_tokens.expires_at > NOW()
          AND users.status = 'ACTIVE'
        FOR UPDATE`,
        [PASSWORD_RESET_TOKEN_TYPE, input.tokenHash],
      );
      const token = tokenResult.rows[0];

      if (!token) {
        return false;
      }

      await client.query(
        "UPDATE user_tokens SET used_at = NOW() WHERE id = $1",
        [token.id],
      );
      await client.query(
        `UPDATE users
        SET password_hash = $1,
            password_change_required = FALSE,
            updated_at = NOW()
        WHERE id = $2`,
        [input.passwordHash, token.user_id],
      );
      await client.query(
        `UPDATE user_sessions
        SET revoked_at = NOW()
        WHERE user_id = $1
          AND revoked_at IS NULL`,
        [token.user_id],
      );

      return true;
    });
  }

  async isPasswordResetTokenValid(tokenHash: string): Promise<boolean> {
    const result = await this.databaseService.query(
      `SELECT 1
      FROM user_tokens
      INNER JOIN users ON users.id = user_tokens.user_id
      WHERE user_tokens.type = $1
        AND user_tokens.token_hash = $2
        AND user_tokens.used_at IS NULL
        AND user_tokens.expires_at > NOW()
        AND users.status = 'ACTIVE'
      LIMIT 1`,
      [PASSWORD_RESET_TOKEN_TYPE, tokenHash],
    );

    return (result.rowCount ?? 0) === 1;
  }

  async verifyInitialEmail(input: VerifyInitialEmailInput): Promise<boolean> {
    return this.databaseService.transaction(async (client) => {
      const tokenResult = await client.query<EmailVerificationTokenRecord>(
        `SELECT user_tokens.id, user_tokens.user_id
        FROM user_tokens
        INNER JOIN users ON users.id = user_tokens.user_id
        WHERE user_tokens.type = $1
          AND user_tokens.token_hash = $2
          AND user_tokens.user_id = $3
          AND user_tokens.used_at IS NULL
          AND user_tokens.expires_at > NOW()
          AND users.password_change_required = TRUE
        FOR UPDATE`,
        [EMAIL_VERIFICATION_TOKEN_TYPE, input.tokenHash, input.userId],
      );
      const token = tokenResult.rows[0];

      if (!token) {
        return false;
      }

      await client.query(
        "UPDATE user_tokens SET used_at = NOW() WHERE id = $1",
        [token.id],
      );
      await client.query(
        `UPDATE users
        SET email_verified_at = COALESCE(email_verified_at, NOW()),
            updated_at = NOW()
        WHERE id = $1`,
        [input.userId],
      );

      return true;
    });
  }

  async completeInitialPassword(
    input: CompleteInitialPasswordInput,
  ): Promise<boolean> {
    const result = await this.databaseService.query(
      `UPDATE users
      SET password_hash = $1,
          password_change_required = FALSE,
          updated_at = NOW()
      WHERE id = $2
        AND password_change_required = TRUE
        AND email_verified_at IS NOT NULL`,
      [input.passwordHash, input.userId],
    );

    return (result.rowCount ?? 0) === 1;
  }
}
