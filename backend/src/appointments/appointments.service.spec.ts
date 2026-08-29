import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";
import type {
  AppointmentsRepository,
  BookingContext,
} from "./appointments.repository";

const context: BookingContext = {
  organization_id: "org-id",
  business_id: "business-id",
  timezone: "Atlantic/Canary",
  currency_code: "EUR",
  customer_id: "customer-id",
  employee_id: "employee-id",
  service_id: "service-id",
  duration_minutes: 60,
  buffer_before_minutes: 10,
  buffer_after_minutes: 5,
  price: "35.00",
  auto_confirm_appointments: false,
  loyalty_earning_type: "INHERIT",
  loyalty_fixed_points: null,
  loyalty_points_per_currency_unit: null,
};

describe("AppointmentsService", () => {
  let service: AppointmentsService;
  const repository = {
    canAccessBusiness: jest.fn(),
    canManageBusiness: jest.fn(),
    findBookingContext: jest.fn(),
    findAppointmentContext: jest.fn(),
    isWithinWorkingHours: jest.fn(),
    hasCalendarBlock: jest.fn(),
    hasAppointmentOverlap: jest.fn(),
    create: jest.fn(),
    listByBusiness: jest.fn(),
    listByCustomerAccount: jest.fn(),
    findByCustomerAccount: jest.fn(),
    findDetailByCustomerAccount: jest.fn(),
    listOccupancy: jest.fn(),
    findById: jest.fn(),
    updateMembershipEligibility: jest.fn(),
    update: jest.fn(),
    setStatus: jest.fn(),
    isAssignedEmployee: jest.fn(),
    customerEmail: jest.fn(),
    createRescheduleProposal: jest.fn(),
    findRescheduleProposal: jest.fn(),
    acceptRescheduleProposal: jest.fn(),
    rejectRescheduleProposal: jest.fn(),
  };
  const emailProvider = { sendAppointmentReschedule: jest.fn() };
  const configService = {
    getOrThrow: jest.fn().mockReturnValue("http://localhost:5173"),
  };
  const auditService = { record: jest.fn().mockResolvedValue(undefined) };
  const loyaltyService = {
    resolveRuleForBooking: jest.fn().mockResolvedValue({
      type: "NONE",
      fixedPoints: null,
      pointsPerCurrencyUnit: null,
    }),
    reconcileAppointment: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AppointmentsService(
      repository as unknown as AppointmentsRepository,
      emailProvider,
      configService,
      auditService,
      loyaltyService,
    );
    repository.canManageBusiness.mockResolvedValue(true);
    repository.canAccessBusiness.mockResolvedValue(true);
    repository.findBookingContext.mockResolvedValue(context);
    repository.findAppointmentContext.mockResolvedValue(context);
    repository.isWithinWorkingHours.mockResolvedValue(true);
    repository.hasCalendarBlock.mockResolvedValue(false);
    repository.hasAppointmentOverlap.mockResolvedValue(false);
    repository.create.mockResolvedValue({ id: "appointment-id" });
    repository.isAssignedEmployee.mockResolvedValue(false);
    repository.customerEmail.mockResolvedValue("customer@example.com");
    loyaltyService.resolveRuleForBooking.mockResolvedValue({
      type: "NONE",
      fixedPoints: null,
      pointsPerCurrencyUnit: null,
    });
    loyaltyService.reconcileAppointment.mockResolvedValue(undefined);
    auditService.record.mockClear();
  });

  it("creates an appointment with service snapshots and occupied buffers", async () => {
    const startAt = new Date(Date.now() + 3_600_000).toISOString();
    await service.create(
      "business-id",
      {
        customerId: "customer-id",
        employeeId: "employee-id",
        serviceId: "service-id",
        startAt,
      },
      "user-id",
    );

    expect(repository.create).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ customerId: "customer-id" }),
      new Date(startAt),
      new Date(new Date(startAt).getTime() + 3_600_000),
      new Date(new Date(startAt).getTime() - 600_000),
      new Date(new Date(startAt).getTime() + 3_900_000),
      expect.stringMatching(/^APT-[A-F0-9]{10}$/),
      "user-id",
      "PENDING",
      false,
      { type: "NONE", fixedPoints: null, pointsPerCurrencyUnit: null },
    );
  });

  it("includes the customer's loyalty summary when listing appointments", async () => {
    repository.listByBusiness.mockResolvedValue([
      {
        id: "appointment-id",
        customer_points_balance: 85,
        customer_loyalty_level_id: "level-id",
        customer_loyalty_level_name: "Gold",
        customer_loyalty_level_minimum_points: 50,
      },
    ]);

    const result = await service.list("business-id", {}, "employee-id");

    expect(result).toEqual([
      expect.objectContaining({
        id: "appointment-id",
        customerLoyalty: {
          pointsBalance: 85,
          currentLevel: {
            id: "level-id",
            name: "Gold",
            minimumPoints: 50,
          },
        },
      }),
    ]);
  });

  it("rejects appointments outside working hours", async () => {
    repository.isWithinWorkingHours.mockResolvedValue(false);
    await expect(
      service.create(
        "business-id",
        {
          customerId: "customer-id",
          employeeId: "employee-id",
          serviceId: "service-id",
          startAt: new Date(Date.now() + 3_600_000).toISOString(),
        },
        "user-id",
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("creates blocked or overlapping appointments pending approval", async () => {
    repository.hasCalendarBlock.mockResolvedValue(true);
    await service.create(
      "business-id",
      {
        customerId: "customer-id",
        employeeId: "employee-id",
        serviceId: "service-id",
        startAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
      "user-id",
    );
    expect(repository.create).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.any(Date),
      expect.any(Date),
      expect.any(Date),
      expect.any(Date),
      expect.any(String),
      "user-id",
      "PENDING",
      true,
      expect.anything(),
    );
    repository.hasCalendarBlock.mockResolvedValue(false);
    repository.hasAppointmentOverlap.mockResolvedValue(true);
    await service.create(
      "business-id",
      {
        customerId: "customer-id",
        employeeId: "employee-id",
        serviceId: "service-id",
        startAt: new Date(Date.now() + 7_200_000).toISOString(),
      },
      "user-id",
    );
    expect(repository.create).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.any(Date),
      expect.any(Date),
      expect.any(Date),
      expect.any(Date),
      expect.any(String),
      "user-id",
      "PENDING",
      true,
      expect.anything(),
    );
  });

  it("rejects an invalid appointment list range", async () => {
    await expect(
      service.list(
        "business-id",
        { from: "2026-10-02T00:00:00.000Z", to: "2026-10-01T00:00:00.000Z" },
        "user-id",
      ),
    ).rejects.toThrow(BadRequestException);
    expect(repository.listByBusiness).not.toHaveBeenCalled();
  });

  it("lists only the appointments linked to the authenticated customer account", async () => {
    repository.listByCustomerAccount.mockResolvedValue([
      {
        id: "appointment-id",
        reference_code: "APT-1234567890",
        status: "CONFIRMED",
        start_at: new Date("2026-10-03T09:00:00.000Z"),
        end_at: new Date("2026-10-03T10:00:00.000Z"),
        business_id: "business-id",
        business_name: "Mi negocio",
        employee_id: "employee-id",
        employee_first_name: "Ana",
        employee_last_name: "Perez",
        service_id: "service-id",
        service_name: "Corte",
      },
    ]);

    await expect(
      service.listForCustomerAccount("org-id", "account-id", {
        status: "CONFIRMED",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "appointment-id",
        business: { id: "business-id", name: "Mi negocio" },
        service: { id: "service-id", name: "Corte" },
      }),
    ]);
    expect(repository.listByCustomerAccount).toHaveBeenCalledWith(
      "org-id",
      "account-id",
      { status: "CONFIRMED" },
    );
  });

  it("returns a customer appointment detail without internal notes", async () => {
    repository.findDetailByCustomerAccount.mockResolvedValue({
      id: "appointment-id",
      reference_code: "APT-1234567890",
      status: "CONFIRMED",
      start_at: new Date("2026-10-03T09:00:00.000Z"),
      end_at: new Date("2026-10-03T10:00:00.000Z"),
      price_amount: "35.00",
      currency_code: "EUR",
      customer_notes: "Cita de prueba",
      cancellation_reason: null,
      cancelled_at: null,
      business_id: "business-id",
      business_name: "Mi negocio",
      employee_id: "employee-id",
      employee_first_name: "Ana",
      employee_last_name: "Perez",
      service_id: "service-id",
      service_name: "Corte",
      service_description: "Corte de pelo",
    });

    await expect(
      service.getForCustomerAccount("org-id", "account-id", "appointment-id"),
    ).resolves.toMatchObject({
      id: "appointment-id",
      customerNotes: "Cita de prueba",
      cancellation: null,
      service: { name: "Corte" },
    });
  });

  it("does not reveal a detail outside the customer account", async () => {
    repository.findDetailByCustomerAccount.mockResolvedValue(null);

    await expect(
      service.getForCustomerAccount("org-id", "account-id", "appointment-id"),
    ).rejects.toThrow(NotFoundException);
  });

  it("allows a customer to cancel only an appointment linked to its account", async () => {
    const appointment = {
      id: "appointment-id",
      organization_id: "org-id",
      business_id: "business-id",
      status: "CONFIRMED",
    };
    repository.findByCustomerAccount.mockResolvedValue(appointment);
    repository.setStatus.mockResolvedValue({
      ...appointment,
      status: "CANCELLED",
    });

    await expect(
      service.cancelForCustomerAccount(
        "org-id",
        "account-id",
        "appointment-id",
        "No puedo asistir",
      ),
    ).resolves.toEqual({ status: "CANCELLED" });
    expect(repository.setStatus).toHaveBeenCalledWith(
      appointment,
      "CANCELLED",
      "No puedo asistir",
      false,
      "CLIENT",
    );
  });

  it("does not reveal appointments that are not linked to the customer account", async () => {
    repository.findByCustomerAccount.mockResolvedValue(null);

    await expect(
      service.cancelForCustomerAccount(
        "org-id",
        "account-id",
        "appointment-id",
      ),
    ).rejects.toThrow(NotFoundException);
    expect(repository.setStatus).not.toHaveBeenCalled();
  });

  it("rejects changes to an appointment that has already started", async () => {
    repository.findByCustomerAccount.mockResolvedValue({
      id: "appointment-id",
      organization_id: "org-id",
      business_id: "business-id",
      status: "CONFIRMED",
      start_at: new Date(Date.now() - 1_000),
    });

    await expect(
      service.cancelForCustomerAccount(
        "org-id",
        "account-id",
        "appointment-id",
      ),
    ).rejects.toThrow("La cita ya ha comenzado");
    expect(repository.setStatus).not.toHaveBeenCalled();
  });

  it("lets an assigned employee mark an appointment for membership counting", async () => {
    const appointment = {
      id: "appointment-id",
      organization_id: "org-id",
      business_id: "business-id",
      employee_id: "employee-id",
      status: "COMPLETED",
      counts_toward_membership: false,
    };
    repository.canManageBusiness.mockResolvedValue(false);
    repository.isAssignedEmployee.mockResolvedValue(true);
    repository.findById.mockResolvedValue(appointment);
    repository.updateMembershipEligibility.mockResolvedValue({
      ...appointment,
      counts_toward_membership: true,
    });

    await expect(
      service.updateMembershipEligibility(
        "business-id",
        "appointment-id",
        true,
        "employee-user-id",
      ),
    ).resolves.toEqual(
      expect.objectContaining({ counts_toward_membership: true }),
    );
    expect(repository.updateMembershipEligibility).toHaveBeenCalledWith(
      appointment,
      true,
    );
  });

  it("rejects membership eligibility changes by an unrelated employee", async () => {
    repository.canManageBusiness.mockResolvedValue(false);
    repository.isAssignedEmployee.mockResolvedValue(false);
    repository.findById.mockResolvedValue({
      id: "appointment-id",
      organization_id: "org-id",
      business_id: "business-id",
      employee_id: "employee-id",
      status: "COMPLETED",
    });

    await expect(
      service.updateMembershipEligibility(
        "business-id",
        "appointment-id",
        true,
        "other-employee-user-id",
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(repository.updateMembershipEligibility).not.toHaveBeenCalled();
  });

  it("creates a confirmed appointment when its service enables auto confirmation", async () => {
    repository.findBookingContext.mockResolvedValue({
      ...context,
      auto_confirm_appointments: true,
    });
    await service.create(
      "business-id",
      {
        customerId: "customer-id",
        employeeId: "employee-id",
        serviceId: "service-id",
        startAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
      "user-id",
    );
    expect(repository.create).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.any(Date),
      expect.any(Date),
      expect.any(Date),
      expect.any(Date),
      expect.any(String),
      "user-id",
      "CONFIRMED",
      false,
      expect.anything(),
    );
  });

  it("allows the assigned employee to confirm a pending appointment", async () => {
    const appointment = {
      id: "appointment-id",
      business_id: "business-id",
      organization_id: "org-id",
      employee_id: "employee-id",
      status: "PENDING",
      start_at: new Date(Date.now() - 1_000),
    };
    repository.canManageBusiness.mockResolvedValue(false);
    repository.findById.mockResolvedValue(appointment);
    repository.isAssignedEmployee.mockResolvedValue(true);
    repository.setStatus.mockResolvedValue({
      ...appointment,
      status: "CONFIRMED",
    });

    await expect(
      service.confirm("business-id", "appointment-id", "employee-user-id"),
    ).resolves.toEqual(expect.objectContaining({ status: "CONFIRMED" }));
    expect(repository.setStatus).toHaveBeenCalledWith(
      appointment,
      "CONFIRMED",
      undefined,
      false,
    );
  });

  it("records a conflict override when an employee confirms a pending overlap", async () => {
    const appointment = {
      id: "appointment-id",
      business_id: "business-id",
      organization_id: "org-id",
      employee_id: "employee-id",
      status: "PENDING",
      start_at: new Date(Date.now() + 3_600_000),
      end_at: new Date(Date.now() + 7_200_000),
      occupied_start_at: new Date(Date.now() + 3_000_000),
      occupied_end_at: new Date(Date.now() + 7_500_000),
    };
    repository.findById.mockResolvedValue(appointment);
    repository.hasAppointmentOverlap.mockResolvedValue(true);
    repository.setStatus.mockResolvedValue({
      ...appointment,
      status: "CONFIRMED",
    });
    await service.confirm("business-id", "appointment-id", "admin-id");
    expect(repository.setStatus).toHaveBeenCalledWith(
      appointment,
      "CONFIRMED",
      undefined,
      true,
    );
  });

  it("allows the assigned employee to complete an appointment after it starts", async () => {
    const appointment = {
      id: "appointment-id",
      business_id: "business-id",
      organization_id: "org-id",
      employee_id: "employee-id",
      status: "CONFIRMED",
      start_at: new Date(Date.now() - 1_000),
    };
    repository.canManageBusiness.mockResolvedValue(false);
    repository.isAssignedEmployee.mockResolvedValue(true);
    repository.findById.mockResolvedValue(appointment);
    repository.setStatus.mockResolvedValue({
      ...appointment,
      status: "COMPLETED",
    });

    await expect(
      service.complete("business-id", "appointment-id", "employee-user-id"),
    ).resolves.toEqual(expect.objectContaining({ status: "COMPLETED" }));
    expect(loyaltyService.reconcileAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ status: "COMPLETED" }),
      "employee-user-id",
    );
  });

  it("reconciles loyalty after changing completed appointment eligibility", async () => {
    const appointment = {
      id: "appointment-id",
      organization_id: "org-id",
      business_id: "business-id",
      employee_id: "employee-id",
      status: "COMPLETED",
      counts_toward_membership: false,
    };
    repository.findById.mockResolvedValue(appointment);
    repository.updateMembershipEligibility.mockResolvedValue({
      ...appointment,
      counts_toward_membership: true,
    });

    await service.updateMembershipEligibility(
      "business-id",
      "appointment-id",
      true,
      "admin-id",
    );

    expect(loyaltyService.reconcileAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ counts_toward_membership: true }),
      "admin-id",
    );
  });

  it("requires a proposal to reassign an appointment to another local day", async () => {
    const startAt = new Date(Date.now() + 2 * 86_400_000);
    const appointment = {
      id: "appointment-id",
      business_id: "business-id",
      organization_id: "org-id",
      customer_id: "customer-id",
      employee_id: "employee-id",
      service_id: "service-id",
      status: "CONFIRMED",
      start_at: startAt,
    };
    repository.findById.mockResolvedValue(appointment);

    await expect(
      service.update(
        "business-id",
        "appointment-id",
        { startAt: new Date(Date.now() + 3 * 86_400_000).toISOString() },
        "admin-id",
      ),
    ).rejects.toThrow("Para reubicar la cita a otro dia");
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("freezes calendar changes after the appointment local day", async () => {
    repository.findById.mockResolvedValue({
      id: "appointment-id",
      business_id: "business-id",
      organization_id: "org-id",
      customer_id: "customer-id",
      employee_id: "employee-id",
      service_id: "service-id",
      status: "CONFIRMED",
      start_at: new Date(Date.now() - 2 * 86_400_000),
    });

    await expect(
      service.update("business-id", "appointment-id", {}, "admin-id"),
    ).rejects.toThrow("El dia de la cita ya ha terminado");
  });

  it("lists occupancy only for a valid time range", async () => {
    await expect(
      service.occupancy(
        "business-id",
        "2026-10-02T00:00:00.000Z",
        "2026-10-01T00:00:00.000Z",
        undefined,
        "user-id",
      ),
    ).rejects.toThrow(BadRequestException);
    expect(repository.listOccupancy).not.toHaveBeenCalled();
  });

  it("creates a reschedule proposal for a different employee and emails the customer", async () => {
    const appointment = {
      id: "appointment-id",
      organization_id: "org-id",
      business_id: "business-id",
      customer_id: "customer-id",
      employee_id: "old-employee",
      service_id: "service-id",
      reference_code: "APT-1",
      status: "CONFIRMED",
      duration_minutes: 60,
      buffer_before_minutes: 10,
      buffer_after_minutes: 5,
    };
    repository.findById.mockResolvedValue(appointment);
    await service.createRescheduleProposal(
      "business-id",
      "appointment-id",
      {
        employeeId: "new-employee",
        startAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
      "admin-id",
    );
    expect(repository.findBookingContext).toHaveBeenLastCalledWith(
      "business-id",
      "customer-id",
      "new-employee",
      "service-id",
    );
    expect(repository.createRescheduleProposal).toHaveBeenCalled();
    expect(emailProvider.sendAppointmentReschedule).toHaveBeenCalled();
  });

  it("rejects an invalid or expired proposal token", async () => {
    repository.findRescheduleProposal.mockResolvedValue(null);
    await expect(
      service.acceptRescheduleProposal("a".repeat(43)),
    ).rejects.toThrow(NotFoundException);
  });

  it("does not accept a proposal when its new slot is occupied", async () => {
    repository.findRescheduleProposal.mockResolvedValue({
      id: "proposal-id",
      appointment_id: "appointment-id",
      business_id: "business-id",
      employee_id: "employee-id",
      customer_id: "customer-id",
      service_id: "service-id",
      appointment_status: "CONFIRMED",
      appointment_start_at: new Date(),
      start_at: new Date(Date.now() + 3_600_000),
      end_at: new Date(Date.now() + 7_200_000),
      occupied_start_at: new Date(Date.now() + 3_000_000),
      occupied_end_at: new Date(Date.now() + 7_500_000),
    });
    repository.hasAppointmentOverlap.mockResolvedValue(true);
    await expect(
      service.acceptRescheduleProposal("a".repeat(43)),
    ).rejects.toThrow(ConflictException);
  });

  it("rejects a valid proposal token only once", async () => {
    repository.rejectRescheduleProposal.mockResolvedValue(true);
    await expect(
      service.rejectRescheduleProposal("a".repeat(43)),
    ).resolves.toEqual({ status: "REJECTED" });
  });
});
