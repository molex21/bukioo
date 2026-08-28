import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";
import { EmailProvider } from "../auth/email.provider";
import { CreateRescheduleProposalDto } from "./dto/create-reschedule-proposal.dto";
import { AuditService } from "../audit/audit.service";
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
    @Inject(EmailProvider) private readonly emailProvider: EmailProvider,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async createRescheduleProposal(
    businessId: string,
    appointmentId: string,
    dto: CreateRescheduleProposalDto,
    userId: string,
  ) {
    const appointment = await this.getAppointment(businessId, appointmentId);
    await this.assertCanConfirm(userId, businessId, appointment);
    this.assertSchedulable(appointment);
    const context = await this.getBookingContext(
      businessId,
      appointment.customer_id,
      dto.employeeId ?? appointment.employee_id,
      appointment.service_id,
    );
    const times = this.buildTimes(dto.startAt, context, appointment);
    await this.assertWithinWorkingHours(context, times);
    const conflicts = await this.getConflicts(context, times, appointment.id);
    if (conflicts.hasAppointmentOverlap || conflicts.hasCalendarBlock)
      throw new ConflictException("La propuesta debe usar un horario libre");
    const email = await this.appointmentsRepository.customerEmail(appointment);
    if (!email)
      throw new BadRequestException("El cliente no tiene un email disponible");
    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    await this.appointmentsRepository.createRescheduleProposal({
      appointment,
      employeeId: context.employee_id,
      ...times,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      userId,
      message: dto.message?.trim(),
    });
    await this.emailProvider.sendAppointmentReschedule({
      email,
      referenceCode: appointment.reference_code,
      startAt: times.startAt,
      url: `${this.configService.getOrThrow<string>("FRONTEND_URL")}/appointments/reschedule?token=${encodeURIComponent(token)}`,
      message: dto.message?.trim(),
    });
    await this.auditService.record({
      organizationId: appointment.organization_id,
      businessId: appointment.business_id,
      actorUserId: userId,
      action: "APPOINTMENT_RESCHEDULE_PROPOSED",
      entityType: "APPOINTMENT",
      entityId: appointment.id,
      newValues: { employeeId: context.employee_id, startAt: times.startAt },
    });
    return { status: "PENDING_CUSTOMER" };
  }

  async acceptRescheduleProposal(token: string) {
    const proposal = await this.appointmentsRepository.findRescheduleProposal(
      this.hashToken(token),
    );
    if (!proposal) throw new NotFoundException("Propuesta invalida o caducada");
    const context = await this.getBookingContext(
      proposal.business_id,
      proposal.customer_id,
      proposal.employee_id,
      proposal.service_id,
    );
    const times = {
      startAt: proposal.start_at,
      endAt: proposal.end_at,
      occupiedStartAt: proposal.occupied_start_at,
      occupiedEndAt: proposal.occupied_end_at,
    };
    await this.assertWithinWorkingHours(context, times);
    const conflicts = await this.getConflicts(
      context,
      times,
      proposal.appointment_id,
    );
    if (conflicts.hasAppointmentOverlap || conflicts.hasCalendarBlock)
      throw new ConflictException("El nuevo horario ya no esta disponible");
    const appointment =
      await this.appointmentsRepository.acceptRescheduleProposal(proposal);
    if (!appointment)
      throw new ConflictException("La propuesta ya no puede aplicarse");
    await this.auditService.record({
      organizationId: appointment.organization_id,
      businessId: appointment.business_id,
      actorUserId: null,
      action: "APPOINTMENT_RESCHEDULE_ACCEPTED",
      entityType: "APPOINTMENT",
      entityId: appointment.id,
      newValues: {
        employeeId: appointment.employee_id,
        startAt: appointment.start_at,
      },
    });
    return appointment;
  }

  async rejectRescheduleProposal(token: string) {
    if (
      !(await this.appointmentsRepository.rejectRescheduleProposal(
        this.hashToken(token),
      ))
    )
      throw new NotFoundException("Propuesta invalida o caducada");
    return { status: "REJECTED" };
  }

  async create(businessId: string, dto: CreateAppointmentDto, userId: string) {
    await this.assertCanManage(userId, businessId);
    const context = await this.getBookingContext(
      businessId,
      dto.customerId,
      dto.employeeId,
      dto.serviceId,
    );
    const times = this.buildTimes(dto.startAt, context);
    await this.assertWithinWorkingHours(context, times);
    const conflicts = await this.getConflicts(context, times);
    const requiresApproval =
      conflicts.hasAppointmentOverlap || conflicts.hasCalendarBlock;
    try {
      const appointment = await this.appointmentsRepository.create(
        context,
        this.normalize(dto),
        times.startAt,
        times.endAt,
        times.occupiedStartAt,
        times.occupiedEndAt,
        this.createReferenceCode(),
        userId,
        context.auto_confirm_appointments && !requiresApproval
          ? "CONFIRMED"
          : "PENDING",
        requiresApproval,
      );
      await this.auditService.record({
        organizationId: appointment.organization_id,
        businessId: appointment.business_id,
        actorUserId: userId,
        action: "APPOINTMENT_CREATED",
        entityType: "APPOINTMENT",
        entityId: appointment.id,
        newValues: {
          status: appointment.status,
          startAt: appointment.start_at,
          employeeId: appointment.employee_id,
        },
      });
      return appointment;
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

    const changesScheduling = dto.startAt || dto.employeeId || dto.serviceId;
    const conflicts = changesScheduling
      ? await this.getConflicts(context, times, appointment.id)
      : { hasAppointmentOverlap: false, hasCalendarBlock: false };
    if (changesScheduling) await this.assertWithinWorkingHours(context, times);
    const requiresApproval =
      conflicts.hasAppointmentOverlap || conflicts.hasCalendarBlock;
    const status: Extract<AppointmentStatus, "PENDING" | "CONFIRMED"> =
      requiresApproval
        ? "PENDING"
        : (appointment.status as "PENDING" | "CONFIRMED");

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
        status,
        requiresApproval,
      );
      if (!updated)
        throw new ConflictException("La cita ya no puede modificarse");
      await this.recordAppointmentAudit(
        "APPOINTMENT_UPDATED",
        userId,
        appointment,
        updated,
      );
      return updated;
    } catch (error: unknown) {
      this.throwAppointmentConflict(error);
    }
  }

  async confirm(businessId: string, appointmentId: string, userId: string) {
    const appointment = await this.getAppointment(businessId, appointmentId);
    await this.assertCanConfirm(userId, businessId, appointment);
    this.assertSchedulable(appointment);
    const context =
      await this.appointmentsRepository.findAppointmentContext(appointment);
    if (!context) throw new NotFoundException("Negocio no encontrado");
    const times = this.buildStoredTimes(appointment);
    const conflicts = await this.getConflicts(context, times, appointment.id);
    const updated = await this.appointmentsRepository.setStatus(
      appointment,
      "CONFIRMED",
      undefined,
      conflicts.hasAppointmentOverlap || conflicts.hasCalendarBlock,
    );
    if (!updated)
      throw new ConflictException("La cita ya no puede actualizarse");
    await this.recordAppointmentAudit(
      "APPOINTMENT_CONFIRMED",
      userId,
      appointment,
      updated,
    );
    return updated;
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

  async occupancy(
    businessId: string,
    from: string,
    to: string,
    employeeId: string | undefined,
    userId: string,
  ) {
    await this.assertCanAccess(userId, businessId);
    if (new Date(from) >= new Date(to)) {
      throw new BadRequestException(
        "La fecha from debe ser anterior a la fecha to",
      );
    }
    return this.appointmentsRepository.listOccupancy(
      businessId,
      from,
      to,
      employeeId,
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
    await this.recordAppointmentAudit(
      `APPOINTMENT_${status}`,
      userId,
      appointment,
      updated,
    );
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

  private buildStoredTimes(appointment: AppointmentRecord): AppointmentTimes {
    return {
      startAt: appointment.start_at,
      endAt: appointment.end_at,
      occupiedStartAt: appointment.occupied_start_at,
      occupiedEndAt: appointment.occupied_end_at,
    };
  }

  private async assertWithinWorkingHours(
    context: BookingContext,
    times: AppointmentTimes,
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
  }

  private async getConflicts(
    context: BookingContext,
    times: AppointmentTimes,
    excludingAppointmentId?: string,
  ): Promise<{ hasAppointmentOverlap: boolean; hasCalendarBlock: boolean }> {
    const [hasCalendarBlock, hasAppointmentOverlap] = await Promise.all([
      this.appointmentsRepository.hasCalendarBlock(
        context,
        times.occupiedStartAt,
        times.occupiedEndAt,
      ),
      this.appointmentsRepository.hasAppointmentOverlap(
        context,
        times.occupiedStartAt,
        times.occupiedEndAt,
        excludingAppointmentId,
      ),
    ]);
    return { hasAppointmentOverlap, hasCalendarBlock };
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

  private async assertCanConfirm(
    userId: string,
    businessId: string,
    appointment: AppointmentRecord,
  ): Promise<void> {
    if (
      (await this.appointmentsRepository.canManageBusiness(
        userId,
        businessId,
      )) ||
      (await this.appointmentsRepository.isAssignedEmployee(
        userId,
        appointment,
      ))
    ) {
      return;
    }
    throw new ForbiddenException("No tienes permiso para confirmar esta cita");
  }

  private createReferenceCode(): string {
    return `APT-${randomBytes(5).toString("hex").toUpperCase()}`;
  }

  private async recordAppointmentAudit(
    action: string,
    actorUserId: string,
    previous: AppointmentRecord,
    current: AppointmentRecord,
  ): Promise<void> {
    await this.auditService.record({
      organizationId: current.organization_id,
      businessId: current.business_id,
      actorUserId,
      action,
      entityType: "APPOINTMENT",
      entityId: current.id,
      oldValues: this.appointmentAuditValues(previous),
      newValues: this.appointmentAuditValues(current),
    });
  }

  private appointmentAuditValues(
    appointment: AppointmentRecord,
  ): Record<string, unknown> {
    return {
      employeeId: appointment.employee_id,
      serviceId: appointment.service_id,
      customerId: appointment.customer_id,
      status: appointment.status,
      startAt: appointment.start_at,
      endAt: appointment.end_at,
      requiresApproval: appointment.requires_approval,
      conflictOverride: appointment.conflict_override,
    };
  }
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
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
