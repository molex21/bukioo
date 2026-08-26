import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { ListAppointmentsDto } from "./dto/list-appointments.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import {
  AppointmentsRepository,
  type AppointmentRecord,
  type AppointmentStatus,
  type BookingContext,
} from "./appointments.repository";

interface AppointmentTimes {
  startAt: Date;
  endAt: Date;
  occupiedStartAt: Date;
  occupiedEndAt: Date;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointmentsRepository: AppointmentsRepository,
  ) {}

  async create(businessId: string, dto: CreateAppointmentDto, userId: string) {
    await this.assertCanManage(userId, businessId);
    const context = await this.getBookingContext(
      businessId,
      dto.customerId,
      dto.employeeId,
      dto.serviceId,
    );
    const times = this.buildTimes(dto.startAt, context);
    await this.assertAvailable(context, times);
    try {
      return await this.appointmentsRepository.create(
        context,
        this.normalize(dto),
        times.startAt,
        times.endAt,
        times.occupiedStartAt,
        times.occupiedEndAt,
        this.createReferenceCode(),
        userId,
      );
    } catch (error: unknown) {
      this.throwAppointmentConflict(error);
    }
  }

  async list(businessId: string, filters: ListAppointmentsDto, userId: string) {
    await this.assertCanAccess(userId, businessId);
    this.assertValidRange(filters);
    return this.appointmentsRepository.listByBusiness(businessId, filters);
  }

  async get(businessId: string, appointmentId: string, userId: string) {
    await this.assertCanAccess(userId, businessId);
    return this.getAppointment(businessId, appointmentId);
  }

  async update(
    businessId: string,
    appointmentId: string,
    dto: UpdateAppointmentDto,
    userId: string,
  ) {
    await this.assertCanManage(userId, businessId);
    const appointment = await this.getAppointment(businessId, appointmentId);
    this.assertSchedulable(appointment);
    const customerId = dto.customerId ?? appointment.customer_id;
    const employeeId = dto.employeeId ?? appointment.employee_id;
    const serviceId = dto.serviceId ?? appointment.service_id;
    const context = await this.getBookingContext(
      businessId,
      customerId,
      employeeId,
      serviceId,
    );
    const replacesSnapshot = serviceId !== appointment.service_id;
    const times = this.buildTimes(
      dto.startAt ?? appointment.start_at.toISOString(),
      context,
      replacesSnapshot ? undefined : appointment,
    );

    if (dto.startAt || dto.employeeId || dto.serviceId) {
      await this.assertAvailable(context, times, appointment.id);
    }

    try {
      const updated = await this.appointmentsRepository.update(
        appointment,
        context,
        this.normalize(dto),
        times.startAt,
        times.endAt,
        times.occupiedStartAt,
        times.occupiedEndAt,
        replacesSnapshot,
      );
      if (!updated)
        throw new ConflictException("La cita ya no puede modificarse");
      return updated;
    } catch (error: unknown) {
      this.throwAppointmentConflict(error);
    }
  }

  async confirm(businessId: string, appointmentId: string, userId: string) {
    return this.changeStatus(businessId, appointmentId, "CONFIRMED", userId);
  }

  async complete(businessId: string, appointmentId: string, userId: string) {
    return this.changeStatus(businessId, appointmentId, "COMPLETED", userId);
  }

  async noShow(businessId: string, appointmentId: string, userId: string) {
    return this.changeStatus(businessId, appointmentId, "NO_SHOW", userId);
  }

  async cancel(
    businessId: string,
    appointmentId: string,
    userId: string,
    reason?: string,
  ) {
    return this.changeStatus(
      businessId,
      appointmentId,
      "CANCELLED",
      userId,
      reason,
    );
  }

  private async changeStatus(
    businessId: string,
    appointmentId: string,
    status: AppointmentStatus,
    userId: string,
    reason?: string,
  ) {
    await this.assertCanManage(userId, businessId);
    const appointment = await this.getAppointment(businessId, appointmentId);
    this.assertSchedulable(appointment);
    const updated = await this.appointmentsRepository.setStatus(
      appointment,
      status,
      reason?.trim(),
    );
    if (!updated)
      throw new ConflictException("La cita ya no puede actualizarse");
    return updated;
  }

  private buildTimes(
    startAtValue: string,
    context: BookingContext,
    snapshot?: AppointmentRecord,
  ): AppointmentTimes {
    const startAt = new Date(startAtValue);
    if (Number.isNaN(startAt.valueOf()) || startAt <= new Date()) {
      throw new BadRequestException("La cita debe programarse en el futuro");
    }
    const duration = snapshot?.duration_minutes ?? context.duration_minutes;
    const bufferBefore =
      snapshot?.buffer_before_minutes ?? context.buffer_before_minutes;
    const bufferAfter =
      snapshot?.buffer_after_minutes ?? context.buffer_after_minutes;
    const endAt = new Date(startAt.getTime() + duration * 60_000);
    return {
      startAt,
      endAt,
      occupiedStartAt: new Date(startAt.getTime() - bufferBefore * 60_000),
      occupiedEndAt: new Date(endAt.getTime() + bufferAfter * 60_000),
    };
  }

  private async assertAvailable(
    context: BookingContext,
    times: AppointmentTimes,
    excludingAppointmentId?: string,
  ): Promise<void> {
    if (
      !(await this.appointmentsRepository.isWithinWorkingHours(
        context,
        times.occupiedStartAt,
        times.occupiedEndAt,
      ))
    ) {
      throw new BadRequestException(
        "La cita queda fuera del horario laboral del empleado",
      );
    }
    if (
      await this.appointmentsRepository.hasCalendarBlock(
        context,
        times.occupiedStartAt,
        times.occupiedEndAt,
      )
    ) {
      throw new ConflictException(
        "El empleado tiene un bloqueo de calendario en ese horario",
      );
    }
    if (
      await this.appointmentsRepository.hasAppointmentOverlap(
        context,
        times.occupiedStartAt,
        times.occupiedEndAt,
        excludingAppointmentId,
      )
    ) {
      throw new ConflictException(
        "El empleado ya tiene una cita en ese horario",
      );
    }
  }

  private async getBookingContext(
    businessId: string,
    customerId: string,
    employeeId: string,
    serviceId: string,
  ): Promise<BookingContext> {
    const context = await this.appointmentsRepository.findBookingContext(
      businessId,
      customerId,
      employeeId,
      serviceId,
    );
    if (!context) {
      throw new BadRequestException(
        "Cliente, empleado o servicio no es valido para este negocio",
      );
    }
    return context;
  }

  private async getAppointment(
    businessId: string,
    appointmentId: string,
  ): Promise<AppointmentRecord> {
    const appointment = await this.appointmentsRepository.findById(
      businessId,
      appointmentId,
    );
    if (!appointment) throw new NotFoundException("Cita no encontrada");
    return appointment;
  }

  private assertSchedulable(appointment: AppointmentRecord): void {
    if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
      throw new ConflictException("La cita ya no puede modificarse");
    }
  }

  private assertValidRange(filters: ListAppointmentsDto): void {
    if (
      filters.from &&
      filters.to &&
      new Date(filters.from) >= new Date(filters.to)
    ) {
      throw new BadRequestException(
        "La fecha from debe ser anterior a la fecha to",
      );
    }
  }

  private async assertCanAccess(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.appointmentsRepository.canAccessBusiness(userId, businessId))
    ) {
      throw new ForbiddenException("No tienes acceso a este negocio");
    }
  }

  private async assertCanManage(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.appointmentsRepository.canManageBusiness(userId, businessId))
    ) {
      throw new ForbiddenException("No tienes permiso para gestionar citas");
    }
  }

  private createReferenceCode(): string {
    return `APT-${randomBytes(5).toString("hex").toUpperCase()}`;
  }

  private normalize<T extends CreateAppointmentDto | UpdateAppointmentDto>(
    dto: T,
  ): T {
    return {
      ...dto,
      customerNotes: dto.customerNotes?.trim(),
      internalNotes: dto.internalNotes?.trim(),
    };
  }

  private throwAppointmentConflict(error: unknown): never {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23P01"
    ) {
      throw new ConflictException(
        "El empleado ya tiene una cita en ese horario",
      );
    }
    throw error;
  }
}
