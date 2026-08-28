import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from "@nestjs/common";
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ReplaceWorkingHoursDto } from "./dto/replace-working-hours.dto";
import { WorkingHoursService } from "./working-hours.service";

@Controller("businesses/:businessId/employees/:employeeId/working-hours")
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkingHoursController {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @CurrentUser() userId: string,
  ) {
    return this.workingHoursService.list(businessId, employeeId, userId);
  }

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async replace(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Body() dto: ReplaceWorkingHoursDto,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.workingHoursService.replace(businessId, employeeId, dto, userId);
  }
}
