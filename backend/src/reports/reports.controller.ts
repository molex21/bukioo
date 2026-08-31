import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { GetReportsOverviewDto } from "./dto/get-reports-overview.dto";
import { GetEmployeeReportsDto } from "./dto/get-employee-reports.dto";
import { ListReportAppointmentsDto } from "./dto/list-report-appointments.dto";
import { ReportsService } from "./reports.service";

@Controller("businesses/:businessId/reports")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("overview")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  getOverview(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: GetReportsOverviewDto,
    @CurrentUser() userId: string,
  ) {
    return this.reportsService.getOverview(businessId, filters, userId);
  }

  @Get("appointments.csv")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async exportAppointments(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: ListReportAppointmentsDto,
    @CurrentUser() userId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const csv = await this.reportsService.exportAppointments(
      businessId,
      filters,
      userId,
    );
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="bukioo-appointments-report.csv"',
    );
    return csv;
  }

  @Get("appointments.xlsx")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async exportAppointmentsXlsx(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: ListReportAppointmentsDto,
    @CurrentUser() userId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const workbook = await this.reportsService.exportAppointmentsXlsx(
      businessId,
      filters,
      userId,
    );
    response.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="bukioo-appointments-report.xlsx"',
    );
    return workbook;
  }

  @Get("appointments")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  listAppointments(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: ListReportAppointmentsDto,
    @CurrentUser() userId: string,
  ) {
    return this.reportsService.listAppointments(businessId, filters, userId);
  }

  @Get("employees")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  getEmployees(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: GetEmployeeReportsDto,
    @CurrentUser() userId: string,
  ) {
    return this.reportsService.getEmployeeReports(businessId, filters, userId);
  }
}
