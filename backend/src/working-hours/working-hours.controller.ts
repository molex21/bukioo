import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from "../auth/jwt-auth.guard";
import { ReplaceWorkingHoursDto } from "./dto/replace-working-hours.dto";
import { WorkingHoursService } from "./working-hours.service";

@Controller("businesses/:businessId/employees/:employeeId/working-hours")
@UseGuards(JwtAuthGuard)
export class WorkingHoursController {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workingHoursService.list(
      businessId,
      employeeId,
      request.userId!,
    );
  }

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  async replace(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Body() dto: ReplaceWorkingHoursDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.workingHoursService.replace(
      businessId,
      employeeId,
      dto,
      request.userId!,
    );
  }
}
