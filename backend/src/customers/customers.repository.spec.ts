import { CustomersRepository } from "./customers.repository";

describe("CustomersRepository", () => {
  const databaseServiceMock = { query: jest.fn() };
  const repository = new CustomersRepository(databaseServiceMock as never);

  afterEach(() => databaseServiceMock.query.mockReset());

  it("filters customer lookups by both customer and business IDs", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [] });

    await expect(
      repository.findById("business-id", "customer-id"),
    ).resolves.toBeNull();

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("business_id = $2"),
      ["customer-id", "business-id"],
    );
  });

  it("does not return anonymized customers from normal lists", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [] });

    await repository.listByBusiness("business-id");

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("anonymized_at IS NULL"),
      ["business-id"],
    );
  });
});
