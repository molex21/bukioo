import { UsersRepository } from "./users.repository";

describe("UsersRepository", () => {
  const databaseServiceMock = { query: jest.fn(), transaction: jest.fn() };
  const repository = new UsersRepository(databaseServiceMock as never);

  afterEach(() => {
    databaseServiceMock.query.mockReset();
    databaseServiceMock.transaction.mockReset();
  });

  it("returns businesses assigned directly to the user or allowed by an administrative role", async () => {
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
