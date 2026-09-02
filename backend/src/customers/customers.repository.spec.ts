import { CustomersRepository } from "./customers.repository";
import type { ListCustomersDto } from "./dto/list-customers.dto";

describe("CustomersRepository", () => {
  const databaseServiceMock = { query: jest.fn() };
  const repository = new CustomersRepository(databaseServiceMock as never);

  afterEach(() => databaseServiceMock.query.mockReset());

  const filters: ListCustomersDto = {
    sortBy: "firstName",
    sortDirection: "asc",
    limit: 25,
    offset: 0,
  };

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

  it("returns a stable paginated list scoped to its business", async () => {
    databaseServiceMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: "2" }] });

    await expect(
      repository.listByBusiness("business-id", filters),
    ).resolves.toEqual({
      data: [],
      pagination: { limit: 25, offset: 0, total: 2 },
    });

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("business_id = $1"),
      ["business-id", 25, 0],
    );
    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("anonymized_at IS NULL"),
      ["business-id"],
    );
    const queryCalls = databaseServiceMock.query.mock.calls as unknown as Array<
      [string, unknown[]]
    >;
    expect(queryCalls[0][0]).toContain("ORDER BY first_name ASC, id ASC");
  });

  it("uses the same case-insensitive search for rows and total", async () => {
    databaseServiceMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: "1" }] });

    await repository.listByBusiness("business-id", {
      ...filters,
      q: "lucia",
      limit: 10,
      offset: 50,
    });

    const queryCalls = databaseServiceMock.query.mock.calls as unknown as Array<
      [string, unknown[]]
    >;
    const [rowQuery, rowValues] = queryCalls[0];
    const [countQuery, countValues] = queryCalls[1];
    expect(rowQuery).toContain("first_name || ' ' || COALESCE(last_name, '')");
    expect(rowQuery).toContain("email || ' ' || phone) ILIKE $2");
    expect(countQuery).toContain("email || ' ' || phone) ILIKE $2");
    expect(rowValues).toEqual(["business-id", "%lucia%", 10, 50]);
    expect(countValues).toEqual(["business-id", "%lucia%"]);
  });

  it("uses only whitelisted columns for descending ordering", async () => {
    databaseServiceMock.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: "0" }] });

    await repository.listByBusiness("business-id", {
      ...filters,
      sortBy: "email",
      sortDirection: "desc",
    });

    const queryCalls = databaseServiceMock.query.mock.calls as unknown as Array<
      [string, unknown[]]
    >;
    expect(queryCalls[0][0]).toContain("ORDER BY email DESC, id ASC");
  });
});
