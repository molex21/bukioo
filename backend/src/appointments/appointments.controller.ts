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
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from "../auth/jwt-auth.guard";
import { AppointmentsService } from "./appointments.service";
import { CancelAppointmentDto } from "./dto/cancel-appointment.dto";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { ListAppointmentsDto } from "./dto/list-appointments.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";

@Controller("businesses/:businessId/appointments")
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() dto: CreateAppointmentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointmentsService.create(businessId, dto, request.userId!);
  }

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: ListAppointmentsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointmentsService.list(businessId, filters, request.userId!);
  }

  @Get(":appointmentId")
  get(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointmentsService.get(
      businessId,
      appointmentId,
      request.userId!,
    );
  }

  @Patch(":appointmentId")
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @Body() dto: UpdateAppointmentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointmentsService.update(
      businessId,
      appointmentId,
      dto,
      request.userId!,
    );
  }

  @Post(":appointmentId/confirm")
  confirm(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointmentsService.confirm(
      businessId,
      appointmentId,
      request.userId!,
    );
  }

  @Post(":appointmentId/complete")
  complete(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointmentsService.complete(
      businessId,
      appointmentId,
      request.userId!,
    );
  }

  @Post(":appointmentId/no-show")
  noShow(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appointmentsService.noShow(
      businessId,
      appointmentId,
      request.userId!,
    );
  }

  @Delete(":appointmentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @Body() dto: CancelAppointmentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.appointmentsService.cancel(
      businessId,
      appointmentId,
      request.userId!,
      dto.reason,
    );
  }
}
