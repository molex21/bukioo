import { Test, TestingModule } from "@nestjs/testing";
import { BusinessesRepository } from "./businesses.repository";
import { BusinessesService } from "./businesses.service";

describe("BusinessesService", () => {
  let service: BusinessesService;

  const repositoryMock = {
    canManageOrganization: jest.fn(),
    create: jest.fn(),
    listByOrganization: jest.fn(),
    findManagedById: jest.fn(),
    findAccessibleById: jest.fn(),
    update: jest.fn(),
    countByOrganization: jest.fn(),
    remove: jest.fn(),
  };

  const business = {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: "22222222-2222-4222-8222-222222222222",
    name: "Example Company",
    slug: "example-company",
    email: null,
    phone: null,
    timezone: "Atlantic/Canary",
    logo_url: null,
    status: "ACTIVE" as const,
    created_at: new Date("2026-08-25T10:00:00.000Z"),
    updated_at: new Date("2026-08-25T10:00:00.000Z"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessesService,
        { provide: BusinessesRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = module.get(BusinessesService);
  });

  afterEach(() => {
    Object.values(repositoryMock).forEach((mock) => mock.mockReset());
  });

  it("creates a business only for an organization the actor manages", async () => {
    repositoryMock.canManageOrganization.mockResolvedValue(true);
    repositoryMock.create.mockResolvedValue(business);

    await expect(
      service.create(
        {
          organizationId: business.organization_id,
          name: " Example Company ",
          slug: "Example-Company",
          logoUrl: " https://cdn.example.com/logo.png ",
        },
        "actor-id",
      ),
    ).resolves.toBe(business);

    expect(repositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Example Company",
        slug: "example-company",
        logoUrl: "https://cdn.example.com/logo.png",
      }),
      "actor-id",
    );
  });

  it("rejects creation in an organization the actor does not manage", async () => {
    repositoryMock.canManageOrganization.mockResolvedValue(false);

    await expect(
      service.create(
        {
          organizationId: business.organization_id,
          name: "Example Company",
          slug: "example-company",
        },
        "actor-id",
      ),
    ).rejects.toMatchObject({ status: 403 });

    expect(repositoryMock.create).not.toHaveBeenCalled();
  });

  it("maps duplicate business slugs to a conflict", async () => {
    repositoryMock.canManageOrganization.mockResolvedValue(true);
    repositoryMock.create.mockRejectedValue({ code: "23505" });

    await expect(
      service.create(
        {
          organizationId: business.organization_id,
          name: "Example Company",
          slug: "example-company",
        },
        "actor-id",
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("returns a business assigned directly to the user", async () => {
    repositoryMock.findAccessibleById.mockResolvedValue(business);

    await expect(service.get(business.id, "employee-id")).resolves.toBe(
      business,
    );

    expect(repositoryMock.findAccessibleById).toHaveBeenCalledWith(
      business.id,
      "employee-id",
    );
  });

  it("rejects reading a business outside the user's access", async () => {
    repositoryMock.findAccessibleById.mockResolvedValue(null);

    await expect(service.get(business.id, "employee-id")).rejects.toMatchObject(
      { status: 403 },
    );
  });

  it("does not remove the final business of an organization", async () => {
    repositoryMock.findManagedById.mockResolvedValue(business);
    repositoryMock.countByOrganization.mockResolvedValue(1);

    await expect(service.remove(business.id, "actor-id")).rejects.toMatchObject(
      { status: 409 },
    );

    expect(repositoryMock.remove).not.toHaveBeenCalled();
  });

  it("requires suspension instead of deleting a business with related data", async () => {
    repositoryMock.findManagedById.mockResolvedValue(business);
    repositoryMock.countByOrganization.mockResolvedValue(2);
    repositoryMock.remove.mockRejectedValue({ code: "23503" });

    await expect(service.remove(business.id, "actor-id")).rejects.toMatchObject(
      { status: 409 },
    );
  });
});
