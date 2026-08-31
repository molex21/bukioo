import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { GetReportsOverviewDto } from "./dto/get-reports-overview.dto";
import type { GetEmployeeReportsDto } from "./dto/get-employee-reports.dto";
import type { ListReportAppointmentsDto } from "./dto/list-report-appointments.dto";

export interface ReportsOverviewRecord {
  total_appointments: string;
  pending_appointments: string;
  confirmed_appointments: string;
  completed_appointments: string;
  cancelled_appointments: string;
  no_show_appointments: string;
  membership_eligible_appointments: string;
  unique_customers: string;
  completed_revenue_amount: string;
  completed_revenue_currency_code: string;
}

export interface ReportAppointmentRecord {
  id: string;
  reference_code: string;
  status: string;
  start_at: Date;
  end_at: Date;
  price_amount: string | null;
  currency_code: string;
  counts_toward_membership: boolean;
  customer_id: string;
  customer_first_name: string;
  customer_last_name: string;
  employee_id: string;
  employee_first_name: string;
  employee_last_name: string;
  service_id: string;
  service_name: string;
}

export interface EmployeeReportRecord {
  employee_id: string;
  employee_first_name: string;
  employee_last_name: string;
  employee_is_active: boolean;
  total_appointments: string;
  pending_appointments: string;
  confirmed_appointments: string;
  completed_appointments: string;
  cancelled_appointments: string;
  no_show_appointments: string;
  membership_eligible_appointments: string;
  unique_customers: string;
  completed_revenue_amount: string;
  completed_revenue_currency_code: string;
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async canManageBusiness(
    userId: string,
    businessId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM businesses
        INNER JOIN organization_memberships
          ON organization_memberships.organization_id = businesses.organization_id
        INNER JOIN users ON users.id = organization_memberships.user_id
        WHERE businesses.id = $1
          AND businesses.status = 'ACTIVE'
          AND organization_memberships.user_id = $2
          AND organization_memberships.status = 'ACTIVE'
          AND organization_memberships.role IN ('OWNER', 'ADMIN')
          AND users.status = 'ACTIVE'
      ) AS exists`,
      [businessId, userId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async getOverview(
    businessId: string,
    filters: GetReportsOverviewDto,
  ): Promise<ReportsOverviewRecord> {
    const result = await this.databaseService.query<ReportsOverviewRecord>(
      `SELECT
        COUNT(*)::text AS total_appointments,
        COUNT(*) FILTER (WHERE status = 'PENDING')::text AS pending_appointments,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED')::text AS confirmed_appointments,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::text AS completed_appointments,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')::text AS cancelled_appointments,
        COUNT(*) FILTER (WHERE status = 'NO_SHOW')::text AS no_show_appointments,
        COUNT(*) FILTER (WHERE counts_toward_membership)::text
          AS membership_eligible_appointments,
        COUNT(DISTINCT customer_id)::text AS unique_customers,
        COALESCE(
          SUM(price_amount) FILTER (WHERE status = 'COMPLETED'),
          0
        )::text AS completed_revenue_amount,
        COALESCE(
          MAX(currency_code) FILTER (WHERE status = 'COMPLETED'),
          (SELECT currency_code FROM businesses WHERE id = $1)
        ) AS completed_revenue_currency_code
      FROM appointments
      WHERE business_id = $1
        AND start_at >= $2::timestamptz
        AND start_at < $3::timestamptz
        AND ($4::uuid IS NULL OR employee_id = $4::uuid)
        AND ($5::uuid IS NULL OR service_id = $5::uuid)`,
      [
        businessId,
        filters.from,
        filters.to,
        filters.employeeId ?? null,
        filters.serviceId ?? null,
      ],
    );
    return result.rows[0];
  }

  async listAppointments(
    businessId: string,
    filters: ListReportAppointmentsDto,
  ): Promise<{ items: ReportAppointmentRecord[]; total: string }> {
    const params = [
      businessId,
      filters.from,
      filters.to,
      filters.employeeId ?? null,
      filters.serviceId ?? null,
      filters.status ?? null,
    ];
    const [itemsResult, totalResult] = await Promise.all([
      this.databaseService.query<ReportAppointmentRecord>(
        `SELECT appointments.id, appointments.reference_code, appointments.status,
          appointments.start_at, appointments.end_at, appointments.price_amount,
          appointments.currency_code, appointments.counts_toward_membership,
          customers.id AS customer_id, customers.first_name AS customer_first_name,
          customers.last_name AS customer_last_name, employees.id AS employee_id,
          employees.first_name AS employee_first_name,
          employees.last_name AS employee_last_name, services.id AS service_id,
          services.name AS service_name
        FROM appointments
        INNER JOIN customers ON customers.id = appointments.customer_id
          AND customers.organization_id = appointments.organization_id
        INNER JOIN employees ON employees.id = appointments.employee_id
          AND employees.organization_id = appointments.organization_id
        INNER JOIN services ON services.id = appointments.service_id
          AND services.organization_id = appointments.organization_id
        WHERE appointments.business_id = $1
          AND appointments.start_at >= $2::timestamptz
          AND appointments.start_at < $3::timestamptz
          AND ($4::uuid IS NULL OR appointments.employee_id = $4::uuid)
          AND ($5::uuid IS NULL OR appointments.service_id = $5::uuid)
          AND ($6::varchar IS NULL OR appointments.status = $6::varchar)
        ORDER BY appointments.start_at DESC, appointments.id DESC
        LIMIT $7 OFFSET $8`,
        [...params, filters.limit ?? 50, filters.offset ?? 0],
      ),
      this.databaseService.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
        FROM appointments
        WHERE business_id = $1
          AND start_at >= $2::timestamptz
          AND start_at < $3::timestamptz
          AND ($4::uuid IS NULL OR employee_id = $4::uuid)
          AND ($5::uuid IS NULL OR service_id = $5::uuid)
          AND ($6::varchar IS NULL OR status = $6::varchar)`,
        params,
      ),
    ]);
    return {
      items: itemsResult.rows,
      total: totalResult.rows[0]?.total ?? "0",
    };
  }

  async exportAppointments(
    businessId: string,
    filters: ListReportAppointmentsDto,
  ): Promise<ReportAppointmentRecord[]> {
    const result = await this.databaseService.query<ReportAppointmentRecord>(
      `SELECT appointments.id, appointments.reference_code, appointments.status,
        appointments.start_at, appointments.end_at, appointments.price_amount,
        appointments.currency_code, appointments.counts_toward_membership,
        customers.id AS customer_id, customers.first_name AS customer_first_name,
        customers.last_name AS customer_last_name, employees.id AS employee_id,
        employees.first_name AS employee_first_name,
        employees.last_name AS employee_last_name, services.id AS service_id,
        services.name AS service_name
      FROM appointments
      INNER JOIN customers ON customers.id = appointments.customer_id
        AND customers.organization_id = appointments.organization_id
      INNER JOIN employees ON employees.id = appointments.employee_id
        AND employees.organization_id = appointments.organization_id
      INNER JOIN services ON services.id = appointments.service_id
        AND services.organization_id = appointments.organization_id
      WHERE appointments.business_id = $1
        AND appointments.start_at >= $2::timestamptz
        AND appointments.start_at < $3::timestamptz
        AND ($4::uuid IS NULL OR appointments.employee_id = $4::uuid)
        AND ($5::uuid IS NULL OR appointments.service_id = $5::uuid)
        AND ($6::varchar IS NULL OR appointments.status = $6::varchar)
      ORDER BY appointments.start_at DESC, appointments.id DESC`,
      [
        businessId,
        filters.from,
        filters.to,
        filters.employeeId ?? null,
        filters.serviceId ?? null,
        filters.status ?? null,
      ],
    );
    return result.rows;
  }

  async getEmployeeReports(
    businessId: string,
    filters: GetEmployeeReportsDto,
  ): Promise<EmployeeReportRecord[]> {
    const result = await this.databaseService.query<EmployeeReportRecord>(
      `SELECT appointments.employee_id,
        employees.first_name AS employee_first_name,
        employees.last_name AS employee_last_name,
        employees.is_active AS employee_is_active,
        COUNT(*)::text AS total_appointments,
        COUNT(*) FILTER (WHERE appointments.status = 'PENDING')::text
          AS pending_appointments,
        COUNT(*) FILTER (WHERE appointments.status = 'CONFIRMED')::text
          AS confirmed_appointments,
        COUNT(*) FILTER (WHERE appointments.status = 'COMPLETED')::text
          AS completed_appointments,
        COUNT(*) FILTER (WHERE appointments.status = 'CANCELLED')::text
          AS cancelled_appointments,
        COUNT(*) FILTER (WHERE appointments.status = 'NO_SHOW')::text
          AS no_show_appointments,
        COUNT(*) FILTER (WHERE appointments.counts_toward_membership)::text
          AS membership_eligible_appointments,
        COUNT(DISTINCT appointments.customer_id)::text AS unique_customers,
        COALESCE(
          SUM(appointments.price_amount)
            FILTER (WHERE appointments.status = 'COMPLETED'),
          0
        )::text AS completed_revenue_amount,
        COALESCE(
          MAX(appointments.currency_code)
            FILTER (WHERE appointments.status = 'COMPLETED'),
          (SELECT currency_code FROM businesses WHERE id = $1)
        ) AS completed_revenue_currency_code
      FROM appointments
      INNER JOIN employees ON employees.id = appointments.employee_id
        AND employees.organization_id = appointments.organization_id
      WHERE appointments.business_id = $1
        AND appointments.start_at >= $2::timestamptz
        AND appointments.start_at < $3::timestamptz
        AND ($4::uuid IS NULL OR appointments.service_id = $4::uuid)
      GROUP BY appointments.employee_id, employees.id,
        employees.first_name, employees.last_name, employees.is_active
      ORDER BY COALESCE(
          SUM(appointments.price_amount)
            FILTER (WHERE appointments.status = 'COMPLETED'),
          0
        ) DESC,
        COUNT(*) DESC, employees.last_name, employees.first_name`,
      [businessId, filters.from, filters.to, filters.serviceId ?? null],
    );
    return result.rows;
  }
}
