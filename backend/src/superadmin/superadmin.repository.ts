import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { CreatePlanDto } from "./dto/create-plan.dto";
import type { ListSuperadminBusinessesDto } from "./dto/list-superadmin-businesses.dto";
import type { ListSuperadminEmployeesDto } from "./dto/list-superadmin-employees.dto";
import type { ListSuperadminOrganizationsDto } from "./dto/list-superadmin-organizations.dto";
import type { SetOrganizationSubscriptionDto } from "./dto/set-organization-subscription.dto";
import type { UpdatePlanDto } from "./dto/update-plan.dto";

export interface PlanRecord {
  code: string;
  name: string;
  max_employees: number | null;
  max_locations: number | null;
  max_monthly_appointments: number | null;
  can_use_loyalty: boolean;
  can_use_advanced_reports: boolean;
  can_use_multiple_locations: boolean;
  can_use_sms: boolean;
  trial_days: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationSubscriptionRecord {
  id: string;
  organization_id: string;
  plan_code: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "EXPIRED";
  trial_started_at: Date | null;
  trial_ends_at: Date | null;
  starts_at: Date;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED";
  created_at: Date;
  business_count: string;
  employee_count: string;
  subscription_plan_code: string | null;
  subscription_status: string | null;
}

interface SuperadminBusinessRecord {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  timezone: string;
  logo_url: string | null;
  status: "ACTIVE" | "SUSPENDED";
  employee_count: string;
  created_at: Date;
}

interface SuperadminEmployeeRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  color: string | null;
  is_active: boolean;
  created_at: Date;
}

@Injectable()
export class SuperadminRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async isActiveSuperadmin(userId: string): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM users
        WHERE id = $1 AND is_superadmin = TRUE AND status = 'ACTIVE'
      ) AS exists`,
      [userId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async getDashboard() {
    const result = await this.databaseService.query<{
      organizations_active: string;
      organizations_suspended: string;
      businesses: string;
      employees: string;
      customers: string;
      appointments: string;
      subscriptions_active: string;
      subscriptions_trial: string;
    }>(`SELECT
      (SELECT COUNT(*) FROM organizations WHERE status = 'ACTIVE')::text AS organizations_active,
      (SELECT COUNT(*) FROM organizations WHERE status = 'SUSPENDED')::text AS organizations_suspended,
      (SELECT COUNT(*) FROM businesses)::text AS businesses,
      (SELECT COUNT(*) FROM employees WHERE is_active = TRUE)::text AS employees,
      (SELECT COUNT(*) FROM customers)::text AS customers,
      (SELECT COUNT(*) FROM appointments)::text AS appointments,
      (SELECT COUNT(*) FROM organization_subscriptions WHERE status = 'ACTIVE')::text AS subscriptions_active,
      (SELECT COUNT(*) FROM organization_subscriptions WHERE status = 'TRIAL')::text AS subscriptions_trial`);
    return result.rows[0];
  }

  async listOrganizations(filters: ListSuperadminOrganizationsDto) {
    const params = [
      filters.search?.trim() || null,
      filters.status ?? null,
      filters.planCode?.trim().toLowerCase() || null,
    ];
    const [items, total] = await Promise.all([
      this.databaseService.query<OrganizationRecord>(
        `SELECT organizations.id, organizations.name, organizations.slug,
          organizations.email, organizations.status, organizations.created_at,
          COUNT(DISTINCT businesses.id)::text AS business_count,
          COUNT(DISTINCT employees.id)::text AS employee_count,
          subscription.plan_code AS subscription_plan_code,
          subscription.status AS subscription_status
        FROM organizations
        LEFT JOIN businesses ON businesses.organization_id = organizations.id
        LEFT JOIN employees ON employees.organization_id = organizations.id
        LEFT JOIN LATERAL (
          SELECT plan_code, status FROM organization_subscriptions
          WHERE organization_id = organizations.id
            AND status IN ('TRIAL', 'ACTIVE', 'SUSPENDED')
          ORDER BY created_at DESC LIMIT 1
        ) subscription ON TRUE
        WHERE ($1::varchar IS NULL OR organizations.name ILIKE '%' || $1 || '%'
          OR organizations.slug ILIKE '%' || $1 || '%'
          OR organizations.email ILIKE '%' || $1 || '%')
          AND ($2::varchar IS NULL OR organizations.status = $2::varchar)
          AND ($3::varchar IS NULL OR subscription.plan_code = $3::varchar)
        GROUP BY organizations.id, subscription.plan_code, subscription.status
        ORDER BY organizations.created_at DESC
        LIMIT $4 OFFSET $5`,
        [...params, filters.limit ?? 50, filters.offset ?? 0],
      ),
      this.databaseService.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
        FROM organizations
        LEFT JOIN LATERAL (
          SELECT plan_code FROM organization_subscriptions
          WHERE organization_id = organizations.id
            AND status IN ('TRIAL', 'ACTIVE', 'SUSPENDED')
          ORDER BY created_at DESC LIMIT 1
        ) subscription ON TRUE
        WHERE ($1::varchar IS NULL OR organizations.name ILIKE '%' || $1 || '%'
          OR organizations.slug ILIKE '%' || $1 || '%'
          OR organizations.email ILIKE '%' || $1 || '%')
          AND ($2::varchar IS NULL OR organizations.status = $2::varchar)
          AND ($3::varchar IS NULL OR subscription.plan_code = $3::varchar)`,
        params,
      ),
    ]);
    return { items: items.rows, total: total.rows[0]?.total ?? "0" };
  }

  async findOrganization(id: string): Promise<OrganizationRecord | null> {
    const result = await this.databaseService.query<OrganizationRecord>(
      `SELECT organizations.id, organizations.name, organizations.slug,
        organizations.email, organizations.status, organizations.created_at,
        COUNT(DISTINCT businesses.id)::text AS business_count,
        COUNT(DISTINCT employees.id)::text AS employee_count,
        subscription.plan_code AS subscription_plan_code,
        subscription.status AS subscription_status
      FROM organizations
      LEFT JOIN businesses ON businesses.organization_id = organizations.id
      LEFT JOIN employees ON employees.organization_id = organizations.id
      LEFT JOIN LATERAL (
        SELECT plan_code, status FROM organization_subscriptions
        WHERE organization_id = organizations.id
          AND status IN ('TRIAL', 'ACTIVE', 'SUSPENDED')
        ORDER BY created_at DESC LIMIT 1
      ) subscription ON TRUE
      WHERE organizations.id = $1
      GROUP BY organizations.id, subscription.plan_code, subscription.status`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async listOrganizationBusinesses(
    organizationId: string,
    filters: ListSuperadminBusinessesDto,
  ) {
    const params = [
      organizationId,
      filters.search?.trim() || null,
      filters.status ?? null,
    ];
    const [items, total] = await Promise.all([
      this.databaseService.query<SuperadminBusinessRecord>(
        `SELECT businesses.id, businesses.organization_id, businesses.name,
          businesses.slug, businesses.email, businesses.phone, businesses.timezone,
          businesses.logo_url, businesses.status, businesses.created_at,
          COUNT(DISTINCT employees.id) FILTER (WHERE employees.is_active = TRUE)::text
            AS employee_count
        FROM businesses
        LEFT JOIN employees ON employees.business_id = businesses.id
          AND employees.organization_id = businesses.organization_id
        WHERE businesses.organization_id = $1
          AND ($2::varchar IS NULL OR businesses.name ILIKE '%' || $2 || '%'
            OR businesses.slug ILIKE '%' || $2 || '%'
            OR businesses.email ILIKE '%' || $2 || '%')
          AND ($3::varchar IS NULL OR businesses.status = $3::varchar)
        GROUP BY businesses.id
        ORDER BY businesses.created_at DESC
        LIMIT $4 OFFSET $5`,
        [...params, filters.limit ?? 50, filters.offset ?? 0],
      ),
      this.databaseService.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
        FROM businesses
        WHERE organization_id = $1
          AND ($2::varchar IS NULL OR name ILIKE '%' || $2 || '%'
            OR slug ILIKE '%' || $2 || '%'
            OR email ILIKE '%' || $2 || '%')
          AND ($3::varchar IS NULL OR status = $3::varchar)`,
        params,
      ),
    ]);
    return { items: items.rows, total: total.rows[0]?.total ?? "0" };
  }

  async findOrganizationBusiness(
    organizationId: string,
    businessId: string,
  ): Promise<SuperadminBusinessRecord | null> {
    const result = await this.databaseService.query<SuperadminBusinessRecord>(
      `SELECT businesses.id, businesses.organization_id, businesses.name,
        businesses.slug, businesses.email, businesses.phone, businesses.timezone,
        businesses.logo_url, businesses.status, businesses.created_at,
        COUNT(DISTINCT employees.id) FILTER (WHERE employees.is_active = TRUE)::text
          AS employee_count
      FROM businesses
      LEFT JOIN employees ON employees.business_id = businesses.id
        AND employees.organization_id = businesses.organization_id
      WHERE businesses.organization_id = $1 AND businesses.id = $2
      GROUP BY businesses.id
      LIMIT 1`,
      [organizationId, businessId],
    );
    return result.rows[0] ?? null;
  }

  async listBusinessEmployees(
    organizationId: string,
    businessId: string,
    filters: ListSuperadminEmployeesDto,
  ) {
    const params = [
      organizationId,
      businessId,
      filters.search?.trim() || null,
      filters.status ?? null,
    ];
    const [items, total] = await Promise.all([
      this.databaseService.query<SuperadminEmployeeRecord>(
        `SELECT id, first_name, last_name, email, phone, color, is_active, created_at
        FROM employees
        WHERE organization_id = $1 AND business_id = $2
          AND ($3::varchar IS NULL OR first_name ILIKE '%' || $3 || '%'
            OR last_name ILIKE '%' || $3 || '%'
            OR email ILIKE '%' || $3 || '%'
            OR phone ILIKE '%' || $3 || '%')
          AND ($4::varchar IS NULL
            OR ($4::varchar = 'ACTIVE' AND is_active = TRUE)
            OR ($4::varchar = 'ARCHIVED' AND is_active = FALSE))
        ORDER BY first_name ASC, last_name ASC, created_at ASC
        LIMIT $5 OFFSET $6`,
        [...params, filters.limit ?? 50, filters.offset ?? 0],
      ),
      this.databaseService.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
        FROM employees
        WHERE organization_id = $1 AND business_id = $2
          AND ($3::varchar IS NULL OR first_name ILIKE '%' || $3 || '%'
            OR last_name ILIKE '%' || $3 || '%'
            OR email ILIKE '%' || $3 || '%'
            OR phone ILIKE '%' || $3 || '%')
          AND ($4::varchar IS NULL
            OR ($4::varchar = 'ACTIVE' AND is_active = TRUE)
            OR ($4::varchar = 'ARCHIVED' AND is_active = FALSE))`,
        params,
      ),
    ]);
    return { items: items.rows, total: total.rows[0]?.total ?? "0" };
  }

  async updateOrganizationStatus(id: string, status: string): Promise<boolean> {
    const result = await this.databaseService.query(
      "UPDATE organizations SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, id],
    );
    return (result.rowCount ?? 0) === 1;
  }

  async updateOrganizationSecurity(
    id: string,
    require2fa: boolean,
  ): Promise<boolean> {
    const result = await this.databaseService.query(
      `UPDATE organization_settings SET require_2fa_for_admins = $1
      WHERE organization_id = $2`,
      [require2fa, id],
    );
    return (result.rowCount ?? 0) === 1;
  }

  async listPlans(): Promise<PlanRecord[]> {
    const result = await this.databaseService.query<PlanRecord>(
      "SELECT * FROM plans ORDER BY created_at ASC",
    );
    return result.rows;
  }

  async findPlan(code: string): Promise<PlanRecord | null> {
    const result = await this.databaseService.query<PlanRecord>(
      "SELECT * FROM plans WHERE code = $1 LIMIT 1",
      [code],
    );
    return result.rows[0] ?? null;
  }

  async createPlan(input: CreatePlanDto): Promise<PlanRecord> {
    const result = await this.databaseService.query<PlanRecord>(
      `INSERT INTO plans (code, name, max_employees, max_locations,
        max_monthly_appointments, can_use_loyalty, can_use_advanced_reports,
        can_use_multiple_locations, can_use_sms, trial_days, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        input.code,
        input.name,
        input.maxEmployees ?? null,
        input.maxLocations ?? null,
        input.maxMonthlyAppointments ?? null,
        input.canUseLoyalty ?? false,
        input.canUseAdvancedReports ?? false,
        input.canUseMultipleLocations ?? false,
        input.canUseSms ?? false,
        input.trialDays ?? 0,
        input.isActive ?? true,
      ],
    );
    return result.rows[0];
  }

  async updatePlan(
    code: string,
    input: UpdatePlanDto,
  ): Promise<PlanRecord | null> {
    const result = await this.databaseService.query<PlanRecord>(
      `UPDATE plans SET name = COALESCE($1, name),
        max_employees = COALESCE($2, max_employees),
        max_locations = COALESCE($3, max_locations),
        max_monthly_appointments = COALESCE($4, max_monthly_appointments),
        can_use_loyalty = COALESCE($5, can_use_loyalty),
        can_use_advanced_reports = COALESCE($6, can_use_advanced_reports),
        can_use_multiple_locations = COALESCE($7, can_use_multiple_locations),
        can_use_sms = COALESCE($8, can_use_sms), trial_days = COALESCE($9, trial_days),
        is_active = COALESCE($10, is_active), updated_at = NOW()
      WHERE code = $11 RETURNING *`,
      [
        input.name,
        input.maxEmployees,
        input.maxLocations,
        input.maxMonthlyAppointments,
        input.canUseLoyalty,
        input.canUseAdvancedReports,
        input.canUseMultipleLocations,
        input.canUseSms,
        input.trialDays,
        input.isActive,
        code,
      ],
    );
    return result.rows[0] ?? null;
  }

  async removePlan(code: string): Promise<boolean> {
    const result = await this.databaseService.query(
      "DELETE FROM plans WHERE code = $1",
      [code],
    );
    return (result.rowCount ?? 0) === 1;
  }

  async setSubscription(
    organizationId: string,
    input: SetOrganizationSubscriptionDto,
  ): Promise<OrganizationSubscriptionRecord> {
    return this.databaseService.transaction(async (client) => {
      await client.query(
        `UPDATE organization_subscriptions SET status = 'EXPIRED', updated_at = NOW()
        WHERE organization_id = $1 AND status IN ('TRIAL', 'ACTIVE', 'SUSPENDED')`,
        [organizationId],
      );
      const result = await client.query<OrganizationSubscriptionRecord>(
        `INSERT INTO organization_subscriptions
          (organization_id, plan_code, status, trial_started_at, trial_ends_at, expires_at)
        VALUES ($1, $2, $3::varchar,
          CASE WHEN $3::varchar = 'TRIAL' THEN NOW() ELSE NULL END,
          $4::timestamptz, $5::timestamptz)
        RETURNING id, organization_id, plan_code, status, trial_started_at,
          trial_ends_at, starts_at, expires_at, created_at, updated_at`,
        [
          organizationId,
          input.planCode,
          input.status,
          input.trialEndsAt ?? null,
          input.expiresAt ?? null,
        ],
      );
      const subscription = result.rows[0];
      if (!subscription) {
        throw new Error("No se pudo crear la suscripcion");
      }
      return subscription;
    });
  }

  async recordAudit(
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValues: unknown,
    newValues: unknown,
  ): Promise<void> {
    await this.databaseService.query(
      `INSERT INTO platform_audit_logs (actor_user_id, action, entity_type, entity_id, old_values, new_values)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorUserId, action, entityType, entityId, oldValues, newValues],
    );
  }
}
