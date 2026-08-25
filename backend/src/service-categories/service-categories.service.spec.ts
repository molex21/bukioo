import { Test, TestingModule } from "@nestjs/testing";
import { ServiceCategoriesRepository } from "./service-categories.repository";
import { ServiceCategoriesService } from "./service-categories.service";

describe("ServiceCategoriesService", () => {
  let service: ServiceCategoriesService;

  const repositoryMock = {
    canAccessBusiness: jest.fn(),
    canManageBusiness: jest.fn(),
    create: jest.fn(),
    listByBusiness: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    countServices: jest.fn(),
    remove: jest.fn(),
  };

  const category = {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: "22222222-2222-4222-8222-222222222222",
    business_id: "33333333-3333-4333-8333-333333333333",
    name: "Haircuts",
    sort_order: 0,
    is_active: true,
    created_at: new Date("2026-08-25T10:00:00.000Z"),
    updated_at: new Date("2026-08-25T10:00:00.000Z"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceCategoriesService,
        { provide: ServiceCategoriesRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = module.get(ServiceCategoriesService);
  });

  afterEach(() => {
    Object.values(repositoryMock).forEach((mock) => mock.mockReset());
  });

  it("creates categories only for a business the actor manages", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.create.mockResolvedValue(category);

    await expect(
      service.create(category.business_id, { name: " Haircuts " }, "actor-id"),
    ).resolves.toBe(category);

    expect(repositoryMock.create).toHaveBeenCalledWith(category.business_id, {
      name: "Haircuts",
    });
  });

  it("rejects listing categories outside the user's business access", async () => {
    repositoryMock.canAccessBusiness.mockResolvedValue(false);

    await expect(
      service.list(category.business_id, "employee-id"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("updates a category active status", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(category);
    repositoryMock.update.mockResolvedValue({ ...category, is_active: false });

    await expect(
      service.update(
        category.business_id,
        category.id,
        { isActive: false },
        "actor-id",
      ),
    ).resolves.toMatchObject({ is_active: false });

    expect(repositoryMock.update).toHaveBeenCalledWith(category, {
      isActive: false,
      name: undefined,
    });
  });

  it("does not delete a category referenced by services", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(category);
    repositoryMock.countServices.mockResolvedValue(1);

    await expect(
      service.remove(category.business_id, category.id, "actor-id"),
    ).rejects.toMatchObject({ status: 409 });

    expect(repositoryMock.remove).not.toHaveBeenCalled();
  });
});
