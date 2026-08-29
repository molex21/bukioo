import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
export interface CustomerAccount {
  id: string;
  organization_id: string;
  email: string;
  status: string;
}

export interface CustomerSessionRecord {
  id: string;
  customer_account_id: string;
  refresh_token_hash: string;
  expires_at: Date;
  account_status: string;
  organization_id: string;
}
@Injectable()
export class CustomerAuthRepository {
  constructor(private readonly database: DatabaseService) {}
  async findOrganization(slug: string) {
    const r = await this.database.query<{ id: string }>(
      "SELECT id FROM organizations WHERE LOWER(slug)=LOWER($1) AND status='ACTIVE' LIMIT 1",
      [slug],
    );
    return r.rows[0] ?? null;
  }
  async findAccount(organizationId: string, email: string) {
    const r = await this.database.query<CustomerAccount>(
      "SELECT id,organization_id,email,status FROM customer_accounts WHERE organization_id=$1 AND LOWER(email)=LOWER($2) LIMIT 1",
      [organizationId, email],
    );
    return r.rows[0] ?? null;
  }
  async findAccountForLogin(organizationId: string, email: string) {
    const r = await this.database.query<
      CustomerAccount & { password_hash: string }
    >(
      "SELECT id,organization_id,email,status,password_hash FROM customer_accounts WHERE organization_id=$1 AND LOWER(email)=LOWER($2) LIMIT 1",
      [organizationId, email],
    );
    return r.rows[0] ?? null;
  }
  async createAccount(
    organizationId: string,
    email: string,
    passwordHash: string,
  ) {
    const r = await this.database.query<CustomerAccount>(
      "INSERT INTO customer_accounts (organization_id,email,password_hash) VALUES ($1,$2,$3) RETURNING id,organization_id,email,status",
      [organizationId, email, passwordHash],
    );
    return r.rows[0];
  }
  async linkCustomers(
    organizationId: string,
    email: string,
    accountId: string,
  ) {
    await this.database.query(
      "UPDATE customers SET customer_account_id=$1, updated_at=NOW() WHERE organization_id=$2 AND LOWER(email)=LOWER($3) AND anonymized_at IS NULL AND customer_account_id IS NULL",
      [accountId, organizationId, email],
    );
  }
  async createSession(
    id: string,
    accountId: string,
    hash: string,
    expiresAt: Date,
  ) {
    const r = await this.database.query<{ id: string }>(
      "INSERT INTO customer_sessions (id,customer_account_id,refresh_token_hash,expires_at) VALUES ($1,$2,$3,$4) RETURNING id",
      [id, accountId, hash, expiresAt],
    );
    return r.rows[0].id;
  }

  async findActiveSession(id: string): Promise<CustomerSessionRecord | null> {
    const r = await this.database.query<CustomerSessionRecord>(
      `SELECT
        customer_sessions.id,
        customer_sessions.customer_account_id,
        customer_sessions.refresh_token_hash,
        customer_sessions.expires_at,
        customer_accounts.status AS account_status,
        customer_accounts.organization_id
      FROM customer_sessions
      INNER JOIN customer_accounts
        ON customer_accounts.id = customer_sessions.customer_account_id
      WHERE customer_sessions.id = $1
        AND customer_sessions.revoked_at IS NULL
        AND customer_sessions.expires_at > NOW()`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async rotateSession(id: string, accountId: string, hash: string) {
    const r = await this.database.query(
      `UPDATE customer_sessions
      SET refresh_token_hash = $1,
          last_used_at = NOW()
      WHERE id = $2
        AND customer_account_id = $3
        AND revoked_at IS NULL
        AND expires_at > NOW()`,
      [hash, id, accountId],
    );
    return r.rowCount === 1;
  }

  async revokeSession(id: string, accountId: string): Promise<void> {
    await this.database.query(
      `UPDATE customer_sessions
      SET revoked_at = NOW()
      WHERE id = $1
        AND customer_account_id = $2
        AND revoked_at IS NULL`,
      [id, accountId],
    );
  }

  async findActiveAccountById(organizationId: string, accountId: string) {
    const r = await this.database.query<CustomerAccount>(
      "SELECT id,organization_id,email,status FROM customer_accounts WHERE id=$1 AND organization_id=$2 AND status='ACTIVE' LIMIT 1",
      [accountId, organizationId],
    );
    return r.rows[0] ?? null;
  }
}
