import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

const EMAIL_VERIFICATION_TOKEN_TYPE = "EMAIL_VERIFICATION";
const PASSWORD_RESET_TOKEN_TYPE = "PASSWORD_RESET";
const EMAIL_CHANGE_TOKEN_TYPE = "EMAIL_CHANGE";
const MAX_EMAIL_CHANGE_ATTEMPTS = 5;

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

export interface CreateEmailChangeTokenInput
  extends CreateEmailVerificationTokenInput {
  newEmail: string;
}

export type ConsumeEmailChangeTokenResult =
  | { status: "changed"; email: string }
  | { status: "invalid" }
  | { status: "conflict" }
  | { status: "too_many_attempts" };

interface EmailVerificationTokenRecord {
  id: string;
  user_id: string;
}

interface EmailChangeTokenRecord extends EmailVerificationTokenRecord {
  token_hash: string;
  metadata: { newEmail?: string };
  attempts: number;
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

  async replaceEmailChangeToken(
    input: CreateEmailChangeTokenInput,
  ): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `UPDATE user_tokens SET used_at = NOW()
        WHERE user_id = $1 AND type = $2 AND used_at IS NULL`,
        [input.userId, EMAIL_CHANGE_TOKEN_TYPE],
      );
      await client.query(
        `INSERT INTO user_tokens (user_id, type, token_hash, expires_at, metadata)
        VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          input.userId,
          EMAIL_CHANGE_TOKEN_TYPE,
          input.tokenHash,
          input.expiresAt,
          JSON.stringify({ newEmail: input.newEmail }),
        ],
      );
    });
  }

  async consumeEmailChangeToken(
    userId: string,
    tokenHash: string,
  ): Promise<ConsumeEmailChangeTokenResult> {
    return this.databaseService.transaction(async (client) => {
      const result = await client.query<EmailChangeTokenRecord>(
        `SELECT id, user_id, token_hash, metadata, attempts
        FROM user_tokens
        WHERE user_id = $1 AND type = $2 AND used_at IS NULL AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [userId, EMAIL_CHANGE_TOKEN_TYPE],
      );
      const token = result.rows[0];
      if (!token) return { status: "invalid" };

      if (token.attempts >= MAX_EMAIL_CHANGE_ATTEMPTS) {
        await client.query(
          "UPDATE user_tokens SET used_at = NOW() WHERE id = $1",
          [token.id],
        );
        return { status: "too_many_attempts" };
      }
      if (token.token_hash !== tokenHash) {
        const attempts = token.attempts + 1;
        await client.query(
          "UPDATE user_tokens SET attempts = $1, used_at = CASE WHEN $1 >= $2 THEN NOW() ELSE used_at END WHERE id = $3",
          [attempts, MAX_EMAIL_CHANGE_ATTEMPTS, token.id],
        );
        return attempts >= MAX_EMAIL_CHANGE_ATTEMPTS
          ? { status: "too_many_attempts" }
          : { status: "invalid" };
      }
      const email = token.metadata.newEmail;
      if (!email) return { status: "invalid" };
      try {
        const updated = await client.query<{ email: string }>(
          `UPDATE users SET email = $1, email_verified_at = NOW(), updated_at = NOW()
          WHERE id = $2 RETURNING email`,
          [email, userId],
        );
        if (!updated.rows[0]) return { status: "invalid" };
        await client.query(
          "UPDATE user_tokens SET used_at = NOW() WHERE id = $1",
          [token.id],
        );
        await client.query(
          "UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
          [userId],
        );
        return { status: "changed", email: updated.rows[0].email };
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505"
        ) {
          return { status: "conflict" };
        }
        throw error;
      }
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
  ): Promise<string | null> {
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
        return null;
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

      return token.user_id;
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
          AND users.status = 'ACTIVE'
          AND users.email_verified_at IS NULL
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
