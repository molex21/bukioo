import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { DatabaseService } from "../database/database.service";
import type { CreateCustomerDto } from "./dto/create-customer.dto";
import type { UpdateCustomerDto } from "./dto/update-customer.dto";
import type { ListCustomersDto } from "./dto/list-customers.dto";

export interface CustomerRecord {
  id: string;
  organization_id: string;
  business_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string;
  notes: string | null;
  points_balance: number;
  created_at: Date;
  updated_at: Date;
  anonymized_at: Date | null;
}

export interface ListedCustomer {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string;
}

export interface PaginatedCustomers {
  data: ListedCustomer[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

const customerSortColumns = {
  firstName: "first_name",
  lastName: "last_name",
  email: "email",
  phone: "phone",
  createdAt: "created_at",
} as const;

@Injectable()
export class CustomersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async canAccessBusiness(
    userId: string,
    businessId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM businesses
        INNER JOIN organization_memberships ON organization_memberships.organization_id = businesses.organization_id
        INNER JOIN users ON users.id = organization_memberships.user_id
        WHERE businesses.id = $1 AND businesses.status = 'ACTIVE'
          AND organization_memberships.user_id = $2
          AND organization_memberships.status = 'ACTIVE' AND users.status = 'ACTIVE'
          AND (organization_memberships.role IN ('OWNER', 'ADMIN') OR EXISTS (
            SELECT 1 FROM business_memberships
            WHERE business_memberships.business_id = businesses.id
              AND business_memberships.user_id = $2
              AND business_memberships.organization_id = businesses.organization_id
          ))
      ) AS exists`,
      [businessId, userId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async canManageBusiness(
    userId: string,
    businessId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM businesses
        INNER JOIN organization_memberships ON organization_memberships.organization_id = businesses.organization_id
        INNER JOIN users ON users.id = organization_memberships.user_id
        WHERE businesses.id = $1 AND businesses.status = 'ACTIVE'
          AND organization_memberships.user_id = $2
          AND organization_memberships.status = 'ACTIVE'
          AND organization_memberships.role IN ('OWNER', 'ADMIN')
          AND users.status = 'ACTIVE'
      ) AS exists`,
      [businessId, userId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async create(
    businessId: string,
    dto: CreateCustomerDto,
  ): Promise<CustomerRecord> {
    const result = await this.databaseService.query<CustomerRecord>(
      `INSERT INTO customers
        (organization_id, business_id, first_name, last_name, email, phone, notes)
      SELECT organization_id, id, $2, $3, $4, $5, $6 FROM businesses WHERE id = $1
      RETURNING id, organization_id, business_id, user_id, first_name, last_name,
        email, phone, notes, points_balance, created_at, updated_at, anonymized_at`,
      [
        businessId,
        dto.firstName,
        dto.lastName ?? null,
        dto.email,
        dto.phone,
        dto.notes ?? null,
      ],
    );
    return result.rows[0];
  }

  async listByBusiness(
    businessId: string,
    filters: ListCustomersDto,
  ): Promise<PaginatedCustomers> {
    const values: unknown[] = [businessId];
    const conditions = ["business_id = $1", "anonymized_at IS NULL"];

    if (filters.q) {
      values.push(`%${filters.q}%`);
      const queryParameter = `$${values.length}`;
      conditions.push(
        `(first_name || ' ' || COALESCE(last_name, '') || ' ' || email || ' ' || phone) ILIKE ${queryParameter}`,
      );
    }

    const whereClause = conditions.join(" AND ");
    const countValues = [...values];
    const sortColumn = customerSortColumns[filters.sortBy];
    const sortDirection = filters.sortDirection === "desc" ? "DESC" : "ASC";
    values.push(filters.limit, filters.offset);

    const [dataResult, countResult] = await Promise.all([
      this.databaseService.query<ListedCustomer>(
        `SELECT id, first_name AS "firstName", last_name AS "lastName", email, phone
        FROM customers
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${sortDirection}, id ASC
        LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      ),
      this.databaseService.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM customers WHERE ${whereClause}`,
        countValues,
      ),
    ]);

    return {
      data: dataResult.rows,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: Number(countResult.rows[0]?.total ?? 0),
      },
    };
  }

  async findById(
    businessId: string,
    customerId: string,
  ): Promise<CustomerRecord | null> {
    const result = await this.databaseService.query<CustomerRecord>(
      `SELECT id, organization_id, business_id, user_id, first_name, last_name,
        email, phone, notes, points_balance, created_at, updated_at, anonymized_at
      FROM customers WHERE id = $1 AND business_id = $2 AND anonymized_at IS NULL LIMIT 1`,
      [customerId, businessId],
    );
    return result.rows[0] ?? null;
  }

  async update(
    customer: CustomerRecord,
    dto: UpdateCustomerDto,
  ): Promise<CustomerRecord> {
    const result = await this.databaseService.query<CustomerRecord>(
      `UPDATE customers SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
        email = COALESCE($3, email), phone = COALESCE($4, phone), notes = COALESCE($5, notes), updated_at = NOW()
      WHERE id = $6 AND business_id = $7 AND organization_id = $8 AND anonymized_at IS NULL
      RETURNING id, organization_id, business_id, user_id, first_name, last_name,
        email, phone, notes, points_balance, created_at, updated_at, anonymized_at`,
      [
        dto.firstName,
        dto.lastName,
        dto.email,
        dto.phone,
        dto.notes,
        customer.id,
        customer.business_id,
        customer.organization_id,
      ],
    );
    return result.rows[0];
  }

  async anonymize(customer: CustomerRecord): Promise<boolean> {
    const anonymizedEmail = `anonymized-${randomUUID()}@invalid.local`;
    const result = await this.databaseService.query(
      `UPDATE customers SET user_id = NULL, first_name = 'Cliente anonimizado', last_name = NULL,
        email = $1, phone = 'ANONYMIZED', notes = NULL, anonymized_at = NOW(), updated_at = NOW()
      WHERE id = $2 AND business_id = $3 AND organization_id = $4 AND anonymized_at IS NULL`,
      [
        anonymizedEmail,
        customer.id,
        customer.business_id,
        customer.organization_id,
      ],
    );
    return (result.rowCount ?? 0) === 1;
  }
}
