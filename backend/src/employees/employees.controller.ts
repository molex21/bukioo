import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { EmployeesService } from "./employees.service";

@Controller("businesses/:businessId/employees")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  create(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() createEmployeeDto: CreateEmployeeDto,
    @CurrentUser() userId: string,
  ) {
    return this.employeesService.create(businessId, createEmployeeDto, userId);
  }

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @CurrentUser() userId: string,
  ) {
    return this.employeesService.list(businessId, userId);
  }

  @Post(":employeeId/invite")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  invite(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @CurrentUser() userId: string,
  ) {
    return this.employeesService.invite(businessId, employeeId, userId);
  }

  @Get(":employeeId")
  get(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @CurrentUser() userId: string,
  ) {
    return this.employeesService.get(businessId, employeeId, userId);
  }

  @Patch(":employeeId")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @CurrentUser() userId: string,
  ) {
    return this.employeesService.update(
      businessId,
      employeeId,
      updateEmployeeDto,
      userId,
    );
  }

  @Post(":employeeId/2fa/reset")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async resetTwoFactor(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.employeesService.resetTwoFactor(businessId, employeeId, userId);
  }

  @Delete(":employeeId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async remove(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.employeesService.remove(businessId, employeeId, userId);
  }
}
