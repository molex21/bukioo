import { Test, TestingModule } from "@nestjs/testing";
import { ServicesRepository } from "./services.repository";
import { ServicesService } from "./services.service";

describe("ServicesService", () => {
  let service: ServicesService;
  const repositoryMock = {
    canAccessBusiness: jest.fn(),
    canManageBusiness: jest.fn(),
    categoryBelongsToBusiness: jest.fn(),
    create: jest.fn(),
    listByBusiness: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    countReferences: jest.fn(),
    remove: jest.fn(),
  };
  const serviceRecord = {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: "22222222-2222-4222-8222-222222222222",
    business_id: "33333333-3333-4333-8333-333333333333",
    category_id: null,
    name: "Haircut",
    description: null,
    price: "25.00",
    duration_minutes: 30,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    minimum_booking_notice_minutes: null,
    maximum_booking_advance_days: null,
    same_day_booking: null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    archived_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: ServicesRepository, useValue: repositoryMock },
      ],
    }).compile();
    service = module.get(ServicesService);
  });

  afterEach(() =>
    Object.values(repositoryMock).forEach((mock) => mock.mockReset()),
  );

  it("creates a normalized service for a managed business", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.create.mockResolvedValue(serviceRecord);

    await expect(
      service.create(
        serviceRecord.business_id,
        {
          name: " Haircut ",
          durationMinutes: 30,
          price: 25,
        },
        "actor-id",
      ),
    ).resolves.toBe(serviceRecord);

    expect(repositoryMock.create).toHaveBeenCalledWith(
      serviceRecord.business_id,
      expect.objectContaining({ name: "Haircut" }),
    );
  });

  it("rejects a category outside the business tenant", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.categoryBelongsToBusiness.mockResolvedValue(false);

    await expect(
      service.create(
        serviceRecord.business_id,
        {
          name: "Haircut",
          durationMinutes: 30,
          categoryId: "44444444-4444-4444-8444-444444444444",
        },
        "actor-id",
      ),
    ).rejects.toMatchObject({ status: 400 });

    expect(repositoryMock.create).not.toHaveBeenCalled();
  });

  it("deletes a service when it has no associated data", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(serviceRecord);
    repositoryMock.countReferences.mockResolvedValue(0);
    repositoryMock.remove.mockResolvedValue(true);

    await expect(
      service.remove(serviceRecord.business_id, serviceRecord.id, "actor-id"),
    ).resolves.toBeUndefined();
    expect(repositoryMock.remove).toHaveBeenCalledWith(serviceRecord);
  });

  it("rejects deletion when the service has associated data", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(serviceRecord);
    repositoryMock.countReferences.mockResolvedValue(1);

    await expect(
      service.remove(serviceRecord.business_id, serviceRecord.id, "actor-id"),
    ).rejects.toMatchObject({ status: 409 });

    expect(repositoryMock.remove).not.toHaveBeenCalled();
  });
});
