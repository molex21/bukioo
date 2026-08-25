import { EmployeesRepository } from "./employees.repository";

describe("EmployeesRepository", () => {
  const databaseServiceMock = {
    query: jest.fn(),
  };

  const repository = new EmployeesRepository(databaseServiceMock as never);

  afterEach(() => {
    databaseServiceMock.query.mockReset();
  });

  it("requires a direct business assignment or an administrative organization role", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [{ exists: true }] });

    await expect(
      repository.canAccessBusiness("user-id", "business-id"),
    ).resolves.toBe(true);

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "business_memberships.business_id = businesses.id",
      ),
      ["business-id", "user-id"],
    );
  });

  it("filters an employee lookup by both employee and business IDs", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [] });

    await expect(
      repository.findActiveById("business-id", "employee-id"),
    ).resolves.toBeNull();

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("AND business_id = $2"),
      ["employee-id", "business-id"],
    );
  });
});
