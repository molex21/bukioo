import { BadRequestException, ConflictException } from "@nestjs/common";
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
};

describe("AppointmentsService", () => {
  let service: AppointmentsService;
  const repository = {
    canAccessBusiness: jest.fn(),
    canManageBusiness: jest.fn(),
    findBookingContext: jest.fn(),
    isWithinWorkingHours: jest.fn(),
    hasCalendarBlock: jest.fn(),
    hasAppointmentOverlap: jest.fn(),
    create: jest.fn(),
    listByBusiness: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    setStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AppointmentsService(
      repository as unknown as AppointmentsRepository,
    );
    repository.canManageBusiness.mockResolvedValue(true);
    repository.canAccessBusiness.mockResolvedValue(true);
    repository.findBookingContext.mockResolvedValue(context);
    repository.isWithinWorkingHours.mockResolvedValue(true);
    repository.hasCalendarBlock.mockResolvedValue(false);
    repository.hasAppointmentOverlap.mockResolvedValue(false);
    repository.create.mockResolvedValue({ id: "appointment-id" });
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

  it("rejects blocked or overlapping appointments", async () => {
    repository.hasCalendarBlock.mockResolvedValue(true);
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
    ).rejects.toThrow(ConflictException);
    repository.hasCalendarBlock.mockResolvedValue(false);
    repository.hasAppointmentOverlap.mockResolvedValue(true);
    await expect(
      service.create(
        "business-id",
        {
          customerId: "customer-id",
          employeeId: "employee-id",
          serviceId: "service-id",
          startAt: new Date(Date.now() + 7_200_000).toISOString(),
        },
        "user-id",
      ),
    ).rejects.toThrow(ConflictException);
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
});
