import { LoginProtectionRepository } from "./login-protection.repository";

describe("LoginProtectionRepository", () => {
  const databaseServiceMock = { query: jest.fn() };
  const repository = new LoginProtectionRepository(
    databaseServiceMock as never,
  );

  afterEach(() => databaseServiceMock.query.mockReset());

  it("records user failures atomically and starts a temporary lock", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [] });

    await repository.recordUserFailure("user-id");

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (user_id) DO UPDATE"),
      ["user-id", 5, 900],
    );
  });

  it("reads a customer lock and clears it after a valid login", async () => {
    databaseServiceMock.query
      .mockResolvedValueOnce({ rows: [{ locked: true }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      repository.isCustomerAccountLocked("account-id"),
    ).resolves.toBe(true);
    await repository.clearCustomerAccountFailures("account-id");

    expect(databaseServiceMock.query).toHaveBeenNthCalledWith(
      2,
      "DELETE FROM customer_account_login_attempts WHERE customer_account_id = $1",
      ["account-id"],
    );
  });
});
