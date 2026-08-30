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
import { LoyaltyService } from "../loyalty/loyalty.service";
import type { LoyaltyRuleSnapshot } from "../loyalty/loyalty.types";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";
import { ListAppointmentsDto } from "./dto/list-appointments.dto";
import { ListCustomerAppointmentsDto } from "./dto/list-customer-appointments.dto";
import { UpdateAppointmentDto } from "./dto/update-appointment.dto";
import {
  AppointmentsRepository,
  type AppointmentRecord,
  type AppointmentStatus,
  type AppointmentWithCustomerLoyaltyRecord,
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
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async createRescheduleProposal(
    businessId: string,
    appointmentId: string,
    dto: CreateRescheduleProposalDto,
    userId: string,
  ) {
    const appointment = await this.getAppointment(businessId, appointmentId);
    await this.assertCanConfirm(userId, businessId, appointment);
    const context = await this.getBookingContext(
      businessId,
      appointment.customer_id,
      dto.employeeId ?? appointment.employee_id,
      appointment.service_id,
    );
    this.assertCalendarEditable(appointment, context.timezone);
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
    this.assertProposalCalendarEditable(proposal, context.timezone);
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
    return this.createAppointment(businessId, dto, userId);
  }

  async createPublic(businessId: string, dto: CreateAppointmentDto) {
    return this.createAppointment(businessId, dto, null);
  }

  private async createAppointment(
    businessId: string,
    dto: CreateAppointmentDto,
    userId: string | null,
  ) {
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
    const loyaltyRuleSnapshot = await this.resolveLoyaltyRule(context);
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
        loyaltyRuleSnapshot,
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
    const appointments = await this.appointmentsRepository.listByBusiness(
      businessId,
      filters,
    );
    return appointments.map((appointment) =>
      this.withCustomerLoyalty(appointment),
    );
  }

  async sendAppointmentReminders(): Promise<{ sent: number; failed: number }> {
    const reminders =
      await this.appointmentsRepository.prepareAppointmentReminders();
    let sent = 0;
    let failed = 0;

    for (const reminder of reminders) {
      try {
        await this.emailProvider.sendAppointmentReminder({
          email: reminder.email,
          businessName: reminder.business_name,
          referenceCode: reminder.reference_code,
          serviceName: reminder.service_name,
          employeeName: `${reminder.employee_first_name} ${reminder.employee_last_name}`,
          startAt: reminder.start_at,
          timezone: reminder.timezone,
        });
        await this.appointmentsRepository.markAppointmentReminderSent(
          reminder.id,
        );
        sent += 1;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error desconocido al enviar";
        await this.appointmentsRepository.markAppointmentReminderFailed(
          reminder.id,
          errorMessage,
        );
        failed += 1;
      }
    }

    return { sent, failed };
  }

  async listForCustomerAccount(
    organizationId: string,
    accountId: string,
    filters: ListCustomerAppointmentsDto,
  ) {
    this.assertValidRange(filters);
    const appointments =
      await this.appointmentsRepository.listByCustomerAccount(
        organizationId,
        accountId,
        filters,
      );
    return appointments.map((appointment) => ({
      id: appointment.id,
      referenceCode: appointment.reference_code,
      status: appointment.status,
      startAt: appointment.start_at,
      endAt: appointment.end_at,
      business: {
        id: appointment.business_id,
        name: appointment.business_name,
      },
      employee: {
        id: appointment.employee_id,
        firstName: appointment.employee_first_name,
        lastName: appointment.employee_last_name,
      },
      service: {
        id: appointment.service_id,
        name: appointment.service_name,
      },
    }));
  }

  async getForCustomerAccount(
    organizationId: string,
    accountId: string,
    appointmentId: string,
  ) {
    const appointment =
      await this.appointmentsRepository.findDetailByCustomerAccount(
        organizationId,
        accountId,
        appointmentId,
      );
    if (!appointment) throw new NotFoundException("Cita no encontrada");

    return {
      id: appointment.id,
      referenceCode: appointment.reference_code,
      status: appointment.status,
      startAt: appointment.start_at,
      endAt: appointment.end_at,
      customerNotes: appointment.customer_notes,
      cancellation: appointment.cancelled_at
        ? {
            reason: appointment.cancellation_reason,
            cancelledAt: appointment.cancelled_at,
          }
        : null,
      price: {
        amount: appointment.price_amount,
        currencyCode: appointment.currency_code,
      },
      business: {
        id: appointment.business_id,
        name: appointment.business_name,
      },
      employee: {
        id: appointment.employee_id,
        firstName: appointment.employee_first_name,
        lastName: appointment.employee_last_name,
      },
      service: {
        id: appointment.service_id,
        name: appointment.service_name,
        description: appointment.service_description,
      },
    };
  }

  async get(businessId: string, appointmentId: string, userId: string) {
    await this.assertCanAccess(userId, businessId);
    return this.withCustomerLoyalty(
      await this.getAppointment(businessId, appointmentId),
    );
  }

  async update(
    businessId: string,
    appointmentId: string,
    dto: UpdateAppointmentDto,
    userId: string,
  ) {
    const appointment = await this.getAppointment(businessId, appointmentId);
    const customerId = dto.customerId ?? appointment.customer_id;
    const employeeId = dto.employeeId ?? appointment.employee_id;
    const serviceId = dto.serviceId ?? appointment.service_id;
    const context = await this.getBookingContext(
      businessId,
      customerId,
      employeeId,
      serviceId,
    );
    await this.assertCanConfirm(userId, businessId, appointment);
    this.assertCalendarEditable(appointment, context.timezone);
    if (
      dto.startAt &&
      this.localDate(dto.startAt, context.timezone) !==
        this.localDate(appointment.start_at, context.timezone)
    ) {
      throw new ConflictException(
        "Para reubicar la cita a otro dia debes crear una propuesta",
      );
    }
    const replacesSnapshot = serviceId !== appointment.service_id;
    const loyaltyRuleSnapshot = replacesSnapshot
      ? await this.resolveLoyaltyRule(context)
      : null;
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
        loyaltyRuleSnapshot,
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
    const context =
      await this.appointmentsRepository.findAppointmentContext(appointment);
    if (!context) throw new NotFoundException("Negocio no encontrado");
    this.assertCalendarEditable(appointment, context.timezone);
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
    await this.loyaltyService.reconcileAppointment(updated, userId);
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
    const appointment = await this.getAppointment(businessId, appointmentId);
    await this.assertCanConfirm(userId, businessId, appointment);
    this.assertCancellable(appointment);
    const updated = await this.appointmentsRepository.setStatus(
      appointment,
      "CANCELLED",
      reason?.trim(),
    );
    if (!updated)
      throw new ConflictException("La cita ya no puede actualizarse");
    await this.recordAppointmentAudit(
      "APPOINTMENT_CANCELLED",
      userId,
      appointment,
      updated,
    );
    await this.loyaltyService.reconcileAppointment(updated, userId);
    return updated;
  }

  async cancelForCustomerAccount(
    organizationId: string,
    accountId: string,
    appointmentId: string,
    reason?: string,
  ) {
    const appointment = await this.appointmentsRepository.findByCustomerAccount(
      organizationId,
      accountId,
      appointmentId,
    );
    if (!appointment) throw new NotFoundException("Cita no encontrada");
    this.assertCancellable(appointment);
    const updated = await this.appointmentsRepository.setStatus(
      appointment,
      "CANCELLED",
      reason?.trim(),
      false,
      "CLIENT",
    );
    if (!updated)
      throw new ConflictException("La cita ya no puede modificarse");
    await this.recordAppointmentAudit(
      "APPOINTMENT_CANCELLED",
      null,
      appointment,
      updated,
    );
    return { status: "CANCELLED" };
  }

  async updateMembershipEligibility(
    businessId: string,
    appointmentId: string,
    countsTowardMembership: boolean,
    userId: string,
  ) {
    const appointment = await this.getAppointment(businessId, appointmentId);
    await this.assertCanConfirm(userId, businessId, appointment);
    const updated =
      await this.appointmentsRepository.updateMembershipEligibility(
        appointment,
        countsTowardMembership,
      );
    if (!updated)
      throw new ConflictException("La cita ya no puede modificarse");
    await this.recordAppointmentAudit(
      "APPOINTMENT_MEMBERSHIP_ELIGIBILITY_UPDATED",
      userId,
      appointment,
      updated,
    );
    await this.loyaltyService.reconcileAppointment(updated, userId);
    return updated;
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
    const appointment = await this.getAppointment(businessId, appointmentId);
    await this.assertCanConfirm(userId, businessId, appointment);
    this.assertOutcomeRecordable(appointment);
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
    await this.loyaltyService.reconcileAppointment(updated, userId);
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

  private async resolveLoyaltyRule(
    context: BookingContext,
  ): Promise<LoyaltyRuleSnapshot> {
    return this.loyaltyService.resolveRuleForBooking(context.business_id, {
      loyalty_earning_type: context.loyalty_earning_type,
      loyalty_fixed_points: context.loyalty_fixed_points,
      loyalty_points_per_currency_unit:
        context.loyalty_points_per_currency_unit,
    });
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
  ): Promise<AppointmentWithCustomerLoyaltyRecord> {
    const appointment = await this.appointmentsRepository.findById(
      businessId,
      appointmentId,
    );
    if (!appointment) throw new NotFoundException("Cita no encontrada");
    return appointment;
  }

  private withCustomerLoyalty(
    appointment: AppointmentWithCustomerLoyaltyRecord,
  ) {
    const {
      customer_points_balance,
      customer_loyalty_level_id,
      customer_loyalty_level_name,
      customer_loyalty_level_minimum_points,
      ...appointmentData
    } = appointment;

    return {
      ...appointmentData,
      customerLoyalty: {
        pointsBalance: customer_points_balance,
        currentLevel: customer_loyalty_level_id
          ? {
              id: customer_loyalty_level_id,
              name: customer_loyalty_level_name!,
              minimumPoints: customer_loyalty_level_minimum_points!,
            }
          : null,
      },
    };
  }

  private assertCalendarEditable(
    appointment: AppointmentRecord,
    timezone: string,
  ): void {
    if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
      throw new ConflictException("La cita ya no puede modificarse");
    }
    if (
      appointment.start_at &&
      this.localDate(appointment.start_at, timezone) <
        this.localDate(new Date(), timezone)
    ) {
      throw new ConflictException("El dia de la cita ya ha terminado");
    }
  }

  private assertProposalCalendarEditable(
    proposal: {
      appointment_status: AppointmentStatus;
      appointment_start_at: Date;
    },
    timezone: string,
  ): void {
    this.assertCalendarEditable(
      {
        status: proposal.appointment_status,
        start_at: proposal.appointment_start_at,
      } as AppointmentRecord,
      timezone,
    );
  }

  private assertCancellable(appointment: AppointmentRecord): void {
    if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
      throw new ConflictException("La cita ya no puede modificarse");
    }
    if (appointment.start_at && appointment.start_at <= new Date()) {
      throw new ConflictException("La cita ya ha comenzado");
    }
  }

  private assertOutcomeRecordable(appointment: AppointmentRecord): void {
    if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
      throw new ConflictException("La cita ya no puede modificarse");
    }
    if (appointment.start_at && appointment.start_at > new Date()) {
      throw new ConflictException("La cita aun no ha comenzado");
    }
  }

  private localDate(value: Date | string, timezone: string): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(value));
    const fields = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    return `${fields.year}-${fields.month}-${fields.day}`;
  }

  private assertValidRange(
    filters: Pick<ListAppointmentsDto, "from" | "to">,
  ): void {
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
    actorUserId: string | null,
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
      countsTowardMembership: appointment.counts_toward_membership,
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
