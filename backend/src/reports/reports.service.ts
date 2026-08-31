import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import ExcelJS from "exceljs";
import { GetEmployeeReportsDto } from "./dto/get-employee-reports.dto";
import { GetReportsOverviewDto } from "./dto/get-reports-overview.dto";
import { ListReportAppointmentsDto } from "./dto/list-report-appointments.dto";
import { ReportsRepository } from "./reports.repository";

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  async getOverview(
    businessId: string,
    filters: GetReportsOverviewDto,
    userId: string,
  ) {
    this.assertValidRange(filters);
    if (!(await this.reportsRepository.canManageBusiness(userId, businessId))) {
      throw new ForbiddenException(
        "No tienes permiso para consultar los reportes",
      );
    }

    const report = await this.reportsRepository.getOverview(
      businessId,
      filters,
    );
    return {
      range: { from: filters.from, to: filters.to },
      filters: {
        employeeId: filters.employeeId ?? null,
        serviceId: filters.serviceId ?? null,
      },
      appointments: {
        total: Number(report.total_appointments),
        pending: Number(report.pending_appointments),
        confirmed: Number(report.confirmed_appointments),
        completed: Number(report.completed_appointments),
        cancelled: Number(report.cancelled_appointments),
        noShow: Number(report.no_show_appointments),
        countsTowardMembership: Number(report.membership_eligible_appointments),
      },
      customers: { unique: Number(report.unique_customers) },
      completedRevenue: {
        amount: report.completed_revenue_amount,
        currencyCode: report.completed_revenue_currency_code,
      },
    };
  }

  async listAppointments(
    businessId: string,
    filters: ListReportAppointmentsDto,
    userId: string,
  ) {
    this.assertValidRange(filters);
    if (!(await this.reportsRepository.canManageBusiness(userId, businessId))) {
      throw new ForbiddenException(
        "No tienes permiso para consultar los reportes",
      );
    }

    const result = await this.reportsRepository.listAppointments(
      businessId,
      filters,
    );
    return {
      range: { from: filters.from, to: filters.to },
      filters: {
        employeeId: filters.employeeId ?? null,
        serviceId: filters.serviceId ?? null,
        status: filters.status ?? null,
      },
      pagination: {
        limit: filters.limit ?? 50,
        offset: filters.offset ?? 0,
        total: Number(result.total),
      },
      items: result.items.map((appointment) => ({
        id: appointment.id,
        referenceCode: appointment.reference_code,
        status: appointment.status,
        startAt: appointment.start_at,
        endAt: appointment.end_at,
        price: {
          amount: appointment.price_amount,
          currencyCode: appointment.currency_code,
        },
        countsTowardMembership: appointment.counts_toward_membership,
        customer: {
          id: appointment.customer_id,
          firstName: appointment.customer_first_name,
          lastName: appointment.customer_last_name,
        },
        employee: {
          id: appointment.employee_id,
          firstName: appointment.employee_first_name,
          lastName: appointment.employee_last_name,
        },
        service: { id: appointment.service_id, name: appointment.service_name },
      })),
    };
  }

  async exportAppointments(
    businessId: string,
    filters: ListReportAppointmentsDto,
    userId: string,
  ): Promise<string> {
    this.assertValidRange(filters);
    if (!(await this.reportsRepository.canManageBusiness(userId, businessId))) {
      throw new ForbiddenException(
        "No tienes permiso para consultar los reportes",
      );
    }

    const appointments = await this.reportsRepository.exportAppointments(
      businessId,
      filters,
    );
    const header = [
      "Referencia",
      "Estado",
      "Inicio",
      "Fin",
      "Importe",
      "Moneda",
      "Cuenta para membresia",
      "Cliente",
      "Empleado",
      "Servicio",
    ];
    const rows = appointments.map((appointment) => [
      appointment.reference_code,
      appointment.status,
      appointment.start_at.toISOString(),
      appointment.end_at.toISOString(),
      appointment.price_amount,
      appointment.currency_code,
      appointment.counts_toward_membership ? "si" : "no",
      `${appointment.customer_first_name} ${appointment.customer_last_name}`,
      `${appointment.employee_first_name} ${appointment.employee_last_name}`,
      appointment.service_name,
    ]);
    return `\uFEFF${[header, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(","))
      .join("\r\n")}\r\n`;
  }

  async exportAppointmentsXlsx(
    businessId: string,
    filters: ListReportAppointmentsDto,
    userId: string,
  ): Promise<Buffer> {
    this.assertValidRange(filters);
    if (!(await this.reportsRepository.canManageBusiness(userId, businessId))) {
      throw new ForbiddenException(
        "No tienes permiso para consultar los reportes",
      );
    }

    const appointments = await this.reportsRepository.exportAppointments(
      businessId,
      filters,
    );
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Citas");
    sheet.columns = [
      { header: "Referencia", key: "referenceCode", width: 18 },
      { header: "Estado", key: "status", width: 16 },
      { header: "Inicio", key: "startAt", width: 26 },
      { header: "Fin", key: "endAt", width: 26 },
      { header: "Importe", key: "amount", width: 14 },
      { header: "Moneda", key: "currency", width: 10 },
      { header: "Cuenta para membresia", key: "membership", width: 24 },
      { header: "Cliente", key: "customer", width: 30 },
      { header: "Empleado", key: "employee", width: 30 },
      { header: "Servicio", key: "service", width: 30 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    for (const appointment of appointments) {
      sheet.addRow({
        referenceCode: this.safeSpreadsheetValue(appointment.reference_code),
        status: appointment.status,
        startAt: appointment.start_at.toISOString(),
        endAt: appointment.end_at.toISOString(),
        amount: appointment.price_amount,
        currency: appointment.currency_code,
        membership: appointment.counts_toward_membership ? "si" : "no",
        customer: `${appointment.customer_first_name} ${appointment.customer_last_name}`,
        employee: `${appointment.employee_first_name} ${appointment.employee_last_name}`,
        service: appointment.service_name,
      });
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async getEmployeeReports(
    businessId: string,
    filters: GetEmployeeReportsDto,
    userId: string,
  ) {
    this.assertValidRange(filters);
    if (!(await this.reportsRepository.canManageBusiness(userId, businessId))) {
      throw new ForbiddenException(
        "No tienes permiso para consultar los reportes",
      );
    }

    const employees = await this.reportsRepository.getEmployeeReports(
      businessId,
      filters,
    );
    return {
      range: { from: filters.from, to: filters.to },
      filters: { serviceId: filters.serviceId ?? null },
      items: employees.map((employee) => ({
        employee: {
          id: employee.employee_id,
          firstName: employee.employee_first_name,
          lastName: employee.employee_last_name,
          isActive: employee.employee_is_active,
        },
        appointments: {
          total: Number(employee.total_appointments),
          pending: Number(employee.pending_appointments),
          confirmed: Number(employee.confirmed_appointments),
          completed: Number(employee.completed_appointments),
          cancelled: Number(employee.cancelled_appointments),
          noShow: Number(employee.no_show_appointments),
          countsTowardMembership: Number(
            employee.membership_eligible_appointments,
          ),
        },
        customers: { unique: Number(employee.unique_customers) },
        completedRevenue: {
          amount: employee.completed_revenue_amount,
          currencyCode: employee.completed_revenue_currency_code,
        },
      })),
    };
  }

  private assertValidRange(filters: { from: string; to: string }): void {
    if (new Date(filters.from) >= new Date(filters.to)) {
      throw new BadRequestException(
        "La fecha from debe ser anterior a la fecha to",
      );
    }
  }

  private escapeCsv(value: string | null): string {
    const normalized = value ?? "";
    const safeValue = /^[=+\-@]/.test(normalized)
      ? `'${normalized}`
      : normalized;

    return `"${safeValue.replaceAll('"', '""')}"`;
  }

  private safeSpreadsheetValue(value: string): string {
    return /^[=+\-@]/.test(value) ? `'${value}` : value;
  }
}
