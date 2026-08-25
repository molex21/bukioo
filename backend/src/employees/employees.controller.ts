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
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from "../auth/jwt-auth.guard";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { EmployeesService } from "./employees.service";

@Controller("businesses/:businessId/employees")
@UseGuards(JwtAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  create(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() createEmployeeDto: CreateEmployeeDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.employeesService.create(
      businessId,
      createEmployeeDto,
      request.userId!,
    );
  }

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.employeesService.list(businessId, request.userId!);
  }

  @Post(":employeeId/invite")
  invite(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.employeesService.invite(
      businessId,
      employeeId,
      request.userId!,
    );
  }

  @Get(":employeeId")
  get(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.employeesService.get(businessId, employeeId, request.userId!);
  }

  @Patch(":employeeId")
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.employeesService.update(
      businessId,
      employeeId,
      updateEmployeeDto,
      request.userId!,
    );
  }

  @Delete(":employeeId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.employeesService.remove(businessId, employeeId, request.userId!);
  }
}
