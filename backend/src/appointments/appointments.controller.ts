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
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AppointmentsService } from "./appointments.service";
import { CancelAppointmentDto } from "./dto/cancel-appointment.dto";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { ListAppointmentsDto } from "./dto/list-appointments.dto";
import { ListAppointmentOccupancyDto } from "./dto/list-appointment-occupancy.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import { CreateRescheduleProposalDto } from "./dto/create-reschedule-proposal.dto";

@Controller("businesses/:businessId/appointments")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  create(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() userId: string,
  ) {
    return this.appointmentsService.create(businessId, dto, userId);
  }

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: ListAppointmentsDto,
    @CurrentUser() userId: string,
  ) {
    return this.appointmentsService.list(businessId, filters, userId);
  }

  @Get("occupancy")
  occupancy(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: ListAppointmentOccupancyDto,
    @CurrentUser() userId: string,
  ) {
    return this.appointmentsService.occupancy(
      businessId,
      filters.from,
      filters.to,
      filters.employeeId,
      userId,
    );
  }

  @Get(":appointmentId")
  get(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @CurrentUser() userId: string,
  ) {
    return this.appointmentsService.get(businessId, appointmentId, userId);
  }

  @Patch(":appointmentId")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() userId: string,
  ) {
    return this.appointmentsService.update(
      businessId,
      appointmentId,
      dto,
      userId,
    );
  }

  @Post(":appointmentId/confirm")
  confirm(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @CurrentUser() userId: string,
  ) {
    return this.appointmentsService.confirm(businessId, appointmentId, userId);
  }

  @Post(":appointmentId/reschedule-proposals")
  createRescheduleProposal(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @Body() dto: CreateRescheduleProposalDto,
    @CurrentUser() userId: string,
  ) {
    return this.appointmentsService.createRescheduleProposal(
      businessId,
      appointmentId,
      dto,
      userId,
    );
  }

  @Post(":appointmentId/complete")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  complete(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @CurrentUser() userId: string,
  ) {
    return this.appointmentsService.complete(businessId, appointmentId, userId);
  }

  @Post(":appointmentId/no-show")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  noShow(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @CurrentUser() userId: string,
  ) {
    return this.appointmentsService.noShow(businessId, appointmentId, userId);
  }

  @Delete(":appointmentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async cancel(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.appointmentsService.cancel(
      businessId,
      appointmentId,
      userId,
      dto.reason,
    );
  }
}
