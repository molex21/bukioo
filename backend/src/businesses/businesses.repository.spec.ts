import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseService } from "../database/database.service";
import { BusinessesRepository } from "./businesses.repository";

describe("BusinessesRepository", () => {
  let repository: BusinessesRepository;

  const clientMock = { query: jest.fn() };
  const databaseServiceMock = {
    query: jest.fn(),
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    databaseServiceMock.transaction.mockImplementation(
      async (callback: (client: typeof clientMock) => Promise<unknown>) =>
        callback(clientMock),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessesRepository,
        { provide: DatabaseService, useValue: databaseServiceMock },
      ],
    }).compile();

    repository = module.get(BusinessesRepository);
  });

  afterEach(() => {
    clientMock.query.mockReset();
    databaseServiceMock.query.mockReset();
    databaseServiceMock.transaction.mockReset();
  });

  it("creates a business and assigns its creator in one transaction", async () => {
    clientMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "business-id",
            organization_id: "organization-id",
            name: "Example Company",
            slug: "example-company",
          },
        ],
      })
      .mockResolvedValue({ rows: [] });

    await expect(
      repository.create(
        {
          organizationId: "organization-id",
          name: "Example Company",
          slug: "example-company",
        },
        "creator-id",
      ),
    ).resolves.toMatchObject({ id: "business-id" });

    expect(databaseServiceMock.transaction).toHaveBeenCalledTimes(1);
    expect(clientMock.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("business_memberships"),
      ["business-id", "creator-id", "organization-id"],
    );
    expect(clientMock.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("business_notification_settings"),
      ["business-id", "organization-id"],
    );
  });

  it("checks management access against an active organization membership", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [{ exists: true }] });

    await expect(
      repository.canManageOrganization("user-id", "organization-id"),
    ).resolves.toBe(true);

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "organization_memberships.role IN ('OWNER', 'ADMIN')",
      ),
      ["organization-id", "user-id"],
    );
  });

  it("finds a business through direct assignment or an administrative role", async () => {
    databaseServiceMock.query.mockResolvedValue({
      rows: [{ id: "business-id", organization_id: "organization-id" }],
    });

    await expect(
      repository.findAccessibleById("business-id", "user-id"),
    ).resolves.toMatchObject({ id: "business-id" });

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "business_memberships.business_id = businesses.id",
      ),
      ["business-id", "user-id"],
    );
  });
});
