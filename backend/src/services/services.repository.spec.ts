import { ServicesRepository } from "./services.repository";

describe("ServicesRepository", () => {
  const databaseServiceMock = { query: jest.fn() };
  const repository = new ServicesRepository(databaseServiceMock as never);

  afterEach(() => databaseServiceMock.query.mockReset());

  it("checks categories against the selected business", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [{ exists: false }] });
    await expect(
      repository.categoryBelongsToBusiness("category-id", "business-id"),
    ).resolves.toBe(false);
    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("business_id = $2"),
      ["category-id", "business-id"],
    );
  });

  it("counts employee assignments and appointments before deletion", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [{ count: "2" }] });

    await expect(
      repository.countReferences({
        id: "service-id",
        business_id: "business-id",
        organization_id: "organization-id",
      } as never),
    ).resolves.toBe(2);

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM appointments"),
      ["service-id", "business-id", "organization-id"],
    );
  });
});
