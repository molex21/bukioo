import { UsersRepository } from "./users.repository";

describe("UsersRepository", () => {
  const databaseServiceMock = { query: jest.fn(), transaction: jest.fn() };
  const repository = new UsersRepository(databaseServiceMock as never);

  afterEach(() => {
    databaseServiceMock.query.mockReset();
    databaseServiceMock.transaction.mockReset();
  });

  it("returns only active businesses available through an active membership", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [] });

    await expect(
      repository.findAccessibleBusinessesByUserId("user-id"),
    ).resolves.toEqual([]);

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("business_memberships.user_id IS NOT NULL"),
      ["user-id"],
    );
    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "organization_memberships.role IN ('OWNER', 'ADMIN')",
      ),
      ["user-id"],
    );
    const [query] = databaseServiceMock.query.mock.calls[0] as [string];
    expect(query).toContain("organization_memberships.status = 'ACTIVE'");
    expect(query).toContain("businesses.status = 'ACTIVE'");
    expect(query).toContain(
      "organization_memberships.role IN ('OWNER', 'ADMIN')",
    );
    expect(query).toContain("OR business_memberships.user_id IS NOT NULL");
  });

  it("returns organizations only when their membership and organization are active", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [] });

    await repository.findActiveOrganizationsByUserId("user-id");

    const [query] = databaseServiceMock.query.mock.calls[0] as [string];
    expect(query).toContain("organization_memberships.status = 'ACTIVE'");
    expect(query).toContain("organizations.status = 'ACTIVE'");
  });

  it("updates the account and active employee profiles in one transaction", async () => {
    const clientMock = { query: jest.fn() };
    databaseServiceMock.transaction.mockImplementation(
      async (callback: (client: typeof clientMock) => Promise<unknown>) =>
        callback(clientMock),
    );
    clientMock.query.mockResolvedValueOnce({
      rows: [{ id: "user-id", email: "user@example.com" }],
    });
    clientMock.query.mockResolvedValueOnce({ rows: [] });

    await repository.updateMyProfile("user-id", {
      firstName: "Grace",
      phone: "600000001",
    });

    expect(clientMock.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("WHERE user_id = $4 AND is_active = TRUE"),
      ["Grace", undefined, "600000001", "user-id"],
    );
  });
});
