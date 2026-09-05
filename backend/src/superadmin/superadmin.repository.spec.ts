import { DatabaseService } from "../database/database.service";
import { SuperadminRepository } from "./superadmin.repository";

describe("SuperadminRepository", () => {
  const clientMock = { query: jest.fn() };
  const databaseServiceMock = { transaction: jest.fn(), query: jest.fn() };
  const repository = new SuperadminRepository(
    databaseServiceMock as unknown as DatabaseService,
  );

  beforeEach(() => {
    databaseServiceMock.transaction.mockImplementation(
      async (callback: (client: typeof clientMock) => Promise<unknown>) =>
        callback(clientMock),
    );
  });

  afterEach(() => {
    clientMock.query.mockReset();
    databaseServiceMock.transaction.mockReset();
    databaseServiceMock.query.mockReset();
  });

  it("casts subscription status consistently when assigning a plan", async () => {
    clientMock.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
      rows: [
        {
          id: "subscription-id",
          organization_id: "organization-id",
          plan_code: "free",
          status: "ACTIVE",
        },
      ],
    });

    await expect(
      repository.setSubscription("organization-id", {
        planCode: "free",
        status: "ACTIVE",
      }),
    ).resolves.toMatchObject({ plan_code: "free", status: "ACTIVE" });

    expect(clientMock.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("$3::varchar = 'TRIAL'"),
      ["organization-id", "free", "ACTIVE", null, null],
    );
  });

  it("scopes business listings and their employee count to one organization", async () => {
    databaseServiceMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: "0" }] });

    await repository.listOrganizationBusinesses("organization-id", {
      search: "centro",
      status: "ACTIVE",
      limit: 25,
      offset: 0,
    });

    const calls = databaseServiceMock.query.mock.calls as Array<
      [string, unknown[]]
    >;
    expect(calls[0][0]).toContain("businesses.organization_id = $1");
    expect(calls[0][0]).toContain("COUNT(DISTINCT employees.id)");
    expect(calls[0][1]).toEqual(["organization-id", "centro", "ACTIVE", 25, 0]);
    expect(calls[1][0]).toContain("organization_id = $1");
  });

  it("scopes employee listings by organization and business with archived filtering", async () => {
    databaseServiceMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: "0" }] });

    await repository.listBusinessEmployees("organization-id", "business-id", {
      status: "ARCHIVED",
      limit: 50,
      offset: 0,
    });

    const calls = databaseServiceMock.query.mock.calls as Array<
      [string, unknown[]]
    >;
    expect(calls[0][0]).toContain("organization_id = $1 AND business_id = $2");
    expect(calls[0][0]).toContain("$4::varchar = 'ARCHIVED'");
    expect(calls[0][0]).toContain(
      "ORDER BY first_name ASC, last_name ASC, created_at ASC",
    );
    expect(calls[0][1]).toEqual([
      "organization-id",
      "business-id",
      null,
      "ARCHIVED",
      50,
      0,
    ]);
  });
});
