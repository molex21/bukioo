import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SuperadminGuard } from "./superadmin.guard";
import { PlatformEmployeesService } from "./platform-employees.service";
import { UpdatePlatformEmployeeDto } from "./dto/update-platform-employee.dto";

@Controller(
  "superadmin/organizations/:organizationId/businesses/:businessId/employees/:employeeId",
)
@UseGuards(JwtAuthGuard, SuperadminGuard)
export class PlatformEmployeesController {
  constructor(private readonly service: PlatformEmployeesService) {}

  @Get()
  get(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @CurrentUser() userId: string,
  ) {
    return this.service.get(organizationId, businessId, employeeId, userId);
  }

  @Patch()
  update(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Body() input: UpdatePlatformEmployeeDto,
    @CurrentUser() userId: string,
  ) {
    return this.service.update(
      organizationId,
      businessId,
      employeeId,
      input,
      userId,
    );
  }
}
