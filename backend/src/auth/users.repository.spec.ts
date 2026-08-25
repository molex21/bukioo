import { UsersRepository } from "./users.repository";

describe("UsersRepository", () => {
  const databaseServiceMock = { query: jest.fn() };
  const repository = new UsersRepository(databaseServiceMock as never);

  afterEach(() => {
    databaseServiceMock.query.mockReset();
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
});
