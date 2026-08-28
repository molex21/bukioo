import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { AvailabilityRepository } from "./availability.repository";
import { AvailabilityService } from "./availability.service";

describe("AvailabilityService", () => {
  const repository = {
    canAccessBusiness: jest.fn(),
    findContext: jest.fn(),
    listSlots: jest.fn(),
  };
  const context = {
    organization_id: "organization-id",
    business_id: "business-id",
    employee_id: "employee-id",
    service_id: "service-id",
    timezone: "Atlantic/Canary",
    duration_minutes: 60,
    buffer_before_minutes: 10,
    buffer_after_minutes: 5,
    minimum_booking_notice_minutes: 0,
    maximum_booking_advance_days: 60,
    same_day_booking: true,
    slot_interval_minutes: 15,
  };
  let service: AvailabilityService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AvailabilityService(
      repository as unknown as AvailabilityRepository,
    );
    repository.canAccessBusiness.mockResolvedValue(true);
    repository.findContext.mockResolvedValue(context);
    repository.listSlots.mockResolvedValue([]);
  });

  it("returns the available slots for an assigned user", async () => {
    const result = await service.list(
      "business-id",
      {
        employeeId: "employee-id",
        serviceId: "service-id",
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-02T00:00:00.000Z",
      },
      "user-id",
    );

    expect(result).toEqual({
      employeeId: "employee-id",
      serviceId: "service-id",
      timezone: "Atlantic/Canary",
      slots: [],
    });
    expect(repository.listSlots).toHaveBeenCalledWith(
      context,
      new Date("2026-09-01T00:00:00.000Z"),
      new Date("2026-09-02T00:00:00.000Z"),
    );
  });

  it("rejects an invalid date range before querying the database", async () => {
    await expect(
      service.list(
        "business-id",
        {
          employeeId: "employee-id",
          serviceId: "service-id",
          from: "2026-09-02T00:00:00.000Z",
          to: "2026-09-01T00:00:00.000Z",
        },
        "user-id",
      ),
    ).rejects.toThrow(BadRequestException);
    expect(repository.canAccessBusiness).not.toHaveBeenCalled();
  });

  it("rejects a range longer than 31 days", async () => {
    await expect(
      service.list(
        "business-id",
        {
          employeeId: "employee-id",
          serviceId: "service-id",
          from: "2026-09-01T00:00:00.000Z",
          to: "2026-10-03T00:00:00.000Z",
        },
        "user-id",
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects a user without business access", async () => {
    repository.canAccessBusiness.mockResolvedValue(false);
    await expect(
      service.list(
        "business-id",
        {
          employeeId: "employee-id",
          serviceId: "service-id",
          from: "2026-09-01T00:00:00.000Z",
          to: "2026-09-02T00:00:00.000Z",
        },
        "user-id",
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects an employee or service outside the business", async () => {
    repository.findContext.mockResolvedValue(null);
    await expect(
      service.list(
        "business-id",
        {
          employeeId: "employee-id",
          serviceId: "service-id",
          from: "2026-09-01T00:00:00.000Z",
          to: "2026-09-02T00:00:00.000Z",
        },
        "user-id",
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("does not expose availability to a different organization", async () => {
    await expect(
      service.listPublic("different-organization", "business-id", {
        employeeId: "employee-id",
        serviceId: "service-id",
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-02T00:00:00.000Z",
      }),
    ).rejects.toThrow(NotFoundException);
    expect(repository.listSlots).not.toHaveBeenCalled();
  });
});
