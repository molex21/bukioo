import {
  BadRequestException,
  ConflictException,
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
    listOccupancy: jest.fn(),
    findById: jest.fn(),
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

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AppointmentsService(
      repository as unknown as AppointmentsRepository,
      emailProvider,
      configService,
      auditService,
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
    );
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
    );
  });

  it("allows the assigned employee to confirm a pending appointment", async () => {
    const appointment = {
      id: "appointment-id",
      business_id: "business-id",
      organization_id: "org-id",
      employee_id: "employee-id",
      status: "PENDING",
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
