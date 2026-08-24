import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseService } from "../database/database.service";
import { OnboardingRepository } from "./onboarding.repository";

describe("OnboardingRepository", () => {
  let repository: OnboardingRepository;

  const clientMock = {
    query: jest.fn(),
  };
  const databaseServiceMock = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingRepository,
        {
          provide: DatabaseService,
          useValue: databaseServiceMock,
        },
      ],
    }).compile();

    repository = module.get<OnboardingRepository>(OnboardingRepository);
    databaseServiceMock.transaction.mockImplementation(
      async (callback: (client: typeof clientMock) => Promise<unknown>) =>
        callback(clientMock),
    );
  });

  afterEach(() => {
    clientMock.query.mockReset();
    databaseServiceMock.transaction.mockReset();
  });

  it("creates the user, organization and owner membership in one transaction", async () => {
    const createdAt = new Date("2026-08-21T10:00:00.000Z");
    clientMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "user-id",
            email: "owner@example.com",
            email_verified_at: null,
            created_at: createdAt,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "organization-id",
            name: "Example Company",
            slug: "example-company",
            timezone: "Atlantic/Canary",
            created_at: createdAt,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "business-id",
            name: "Example Company",
            slug: "example-company",
            timezone: "Atlantic/Canary",
            created_at: createdAt,
          },
        ],
      })
      .mockResolvedValue({ rows: [] });

    await expect(
      repository.create({
        email: "owner@example.com",
        passwordHash: "password-hash",
        organizationName: "Example Company",
        organizationSlug: "example-company",
        timezone: "Atlantic/Canary",
      }),
    ).resolves.toMatchObject({
      user: { id: "user-id" },
      organization: { id: "organization-id" },
      business: { id: "business-id" },
    });

    expect(databaseServiceMock.transaction).toHaveBeenCalledTimes(1);
    expect(clientMock.query).toHaveBeenCalledTimes(7);
    expect(clientMock.query).toHaveBeenLastCalledWith(
      expect.stringContaining("business_memberships"),
      ["business-id", "user-id", "organization-id"],
    );
  });
});
