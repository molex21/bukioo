import { NotFoundException } from "@nestjs/common";
import { AvailabilityService } from "../availability/availability.service";
import { PublicBookingRepository } from "./public-booking.repository";
import { PublicBookingService } from "./public-booking.service";

describe("PublicBookingService", () => {
  const repository = {
    findActiveOrganization: jest.fn(),
    listActiveServices: jest.fn(),
    listActiveEmployees: jest.fn(),
  };
  const organization = {
    id: "organization-id",
    name: "Mi organizacion",
    slug: "mi-organizacion",
    timezone: "Atlantic/Canary",
  };
  const availabilityService = { listPublic: jest.fn() };
  let service: PublicBookingService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new PublicBookingService(
      repository as unknown as PublicBookingRepository,
      availabilityService as unknown as AvailabilityService,
    );
    repository.findActiveOrganization.mockResolvedValue(organization);
    repository.listActiveServices.mockResolvedValue([]);
    repository.listActiveEmployees.mockResolvedValue([]);
    availabilityService.listPublic.mockResolvedValue({ slots: [] });
  });

  it("returns only public service fields for an active organization", async () => {
    repository.listActiveServices.mockResolvedValue([
      {
        id: "service-id",
        name: "Corte",
        description: "Corte de pelo",
        price: "20.00",
        duration_minutes: 30,
        business_id: "business-id",
        business_name: "Mi negocio",
      },
    ]);

    await expect(
      service.listServices(" MI-ORGANIZACION ", {
        businessId: "business-id",
      }),
    ).resolves.toEqual({
      organization: {
        name: "Mi organizacion",
        slug: "mi-organizacion",
        timezone: "Atlantic/Canary",
      },
      services: [
        {
          id: "service-id",
          name: "Corte",
          description: "Corte de pelo",
          price: "20.00",
          durationMinutes: 30,
          business: { id: "business-id", name: "Mi negocio" },
        },
      ],
    });
    expect(repository.findActiveOrganization).toHaveBeenCalledWith(
      "mi-organizacion",
    );
    expect(repository.listActiveServices).toHaveBeenCalledWith(
      "organization-id",
      "business-id",
    );
  });

  it("does not expose services for an inactive or unknown organization", async () => {
    repository.findActiveOrganization.mockResolvedValue(null);

    await expect(
      service.listServices("missing", { businessId: "business-id" }),
    ).rejects.toThrow(NotFoundException);
    expect(repository.listActiveServices).not.toHaveBeenCalled();
  });

  it("returns only active employees assigned to the selected service", async () => {
    repository.listActiveEmployees.mockResolvedValue([
      {
        id: "employee-id",
        first_name: "Ana",
        last_name: "Perez",
      },
    ]);

    await expect(
      service.listEmployees("mi-organizacion", {
        businessId: "business-id",
        serviceId: "service-id",
      }),
    ).resolves.toEqual({
      employees: [
        {
          id: "employee-id",
          firstName: "Ana",
          lastName: "Perez",
        },
      ],
    });
    expect(repository.listActiveEmployees).toHaveBeenCalledWith(
      "organization-id",
      "business-id",
      "service-id",
    );
  });

  it("delegates public availability to the shared availability service", async () => {
    await expect(
      service.listAvailability("mi-organizacion", {
        businessId: "business-id",
        employeeId: "employee-id",
        serviceId: "service-id",
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-02T00:00:00.000Z",
      }),
    ).resolves.toEqual({ slots: [] });
    expect(availabilityService.listPublic).toHaveBeenCalledWith(
      "organization-id",
      "business-id",
      {
        employeeId: "employee-id",
        serviceId: "service-id",
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-02T00:00:00.000Z",
      },
    );
  });
});
