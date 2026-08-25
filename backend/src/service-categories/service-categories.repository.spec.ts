import { ServiceCategoriesRepository } from "./service-categories.repository";

describe("ServiceCategoriesRepository", () => {
  const databaseServiceMock = { query: jest.fn() };
  const repository = new ServiceCategoriesRepository(
    databaseServiceMock as never,
  );

  afterEach(() => {
    databaseServiceMock.query.mockReset();
  });

  it("requires direct business assignment or an administrative role to read", async () => {
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

  it("counts only services from the category's own business and organization", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [{ count: "1" }] });

    await expect(
      repository.countServices({
        id: "category-id",
        business_id: "business-id",
        organization_id: "organization-id",
      } as never),
    ).resolves.toBe(1);

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("AND business_id = $2"),
      ["category-id", "business-id", "organization-id"],
    );
  });
});
