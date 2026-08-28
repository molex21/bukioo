import { Test } from "@nestjs/testing";
import { DatabaseService } from "../database/database.service";
import { AuthorizationRepository } from "./authorization.repository";

describe("AuthorizationRepository", () => {
  let repository: AuthorizationRepository;

  const databaseServiceMock = { query: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthorizationRepository,
        { provide: DatabaseService, useValue: databaseServiceMock },
      ],
    }).compile();

    repository = module.get(AuthorizationRepository);
  });

  afterEach(() => {
    databaseServiceMock.query.mockReset();
  });

  it("finds only an active organization membership role", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [{ role: "ADMIN" }] });

    await expect(
      repository.findOrganizationRole("user-id", "organization-id"),
    ).resolves.toBe("ADMIN");

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("organization_memberships.status = 'ACTIVE'"),
      ["organization-id", "user-id"],
    );
  });

  it("does not return a role for an inaccessible business", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [] });

    await expect(
      repository.findBusinessRole("user-id", "other-business-id"),
    ).resolves.toBeNull();
  });
});
