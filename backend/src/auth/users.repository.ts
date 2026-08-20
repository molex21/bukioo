import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  email_verified_at: Date | null;
  preferred_locale: string | null;
  is_superadmin: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.databaseService.query<UserRecord>(
      "SELECT id, email, password_hash, email_verified_at, preferred_locale, is_superadmin, status, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email],
    );
    return result.rows[0] ?? null;
  }

  async create(email: string, passwordHash: string): Promise<UserRecord> {
    const result = await this.databaseService.query<UserRecord>(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, password_hash, email_verified_at, preferred_locale, is_superadmin, status, created_at, updated_at",
      [email, passwordHash],
    );
    return result.rows[0];
  }
}
