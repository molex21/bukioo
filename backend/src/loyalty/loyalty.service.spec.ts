import { Test, TestingModule } from "@nestjs/testing";
import { LoyaltyRepository } from "./loyalty.repository";
import { LoyaltyService } from "./loyalty.service";

describe("LoyaltyService", () => {
  let service: LoyaltyService;

  const repositoryMock = {
    canAccessBusiness: jest.fn(),
    canManageBusiness: jest.fn(),
    create: jest.fn(),
    listByBusiness: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    countCustomers: jest.fn(),
    remove: jest.fn(),
  };

  const level = {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: "22222222-2222-4222-8222-222222222222",
    business_id: "33333333-3333-4333-8333-333333333333",
    name: "Gold",
    minimum_points: 100,
    sort_order: 1,
    is_active: true,
    created_at: new Date("2026-08-29T10:00:00.000Z"),
    updated_at: new Date("2026-08-29T10:00:00.000Z"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        { provide: LoyaltyRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = module.get(LoyaltyService);
  });

  afterEach(() => {
    Object.values(repositoryMock).forEach((mock) => mock.mockReset());
  });

  it("creates a level only for an actor who manages the business", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.create.mockResolvedValue(level);

    await expect(
      service.create(
        level.business_id,
        { name: " Gold ", minimumPoints: 100 },
        "actor-id",
      ),
    ).resolves.toBe(level);

    expect(repositoryMock.create).toHaveBeenCalledWith(level.business_id, {
      name: "Gold",
      minimumPoints: 100,
    });
  });

  it("rejects listing levels outside the user's business access", async () => {
    repositoryMock.canAccessBusiness.mockResolvedValue(false);

    await expect(
      service.list(level.business_id, "employee-id"),
    ).rejects.toMatchObject({
      status: 403,
    });
  });

  it("updates a level active status", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(level);
    repositoryMock.update.mockResolvedValue({ ...level, is_active: false });

    await expect(
      service.update(
        level.business_id,
        level.id,
        { isActive: false },
        "actor-id",
      ),
    ).resolves.toMatchObject({ is_active: false });
  });

  it("does not delete a level referenced by customers", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(level);
    repositoryMock.countCustomers.mockResolvedValue(1);

    await expect(
      service.remove(level.business_id, level.id, "actor-id"),
    ).rejects.toMatchObject({ status: 409 });

    expect(repositoryMock.remove).not.toHaveBeenCalled();
  });
});
