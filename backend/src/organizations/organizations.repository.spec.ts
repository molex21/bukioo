import { OrganizationsRepository } from "./organizations.repository";

describe("OrganizationsRepository", () => {
  const databaseServiceMock = { query: jest.fn() };
  const repository = new OrganizationsRepository(databaseServiceMock as never);

  afterEach(() => databaseServiceMock.query.mockReset());

  it("updates the organization's logo URL and permits clearing it", async () => {
    databaseServiceMock.query.mockResolvedValue({
      rows: [{ id: "organization-id", logo_url: null }],
    });

    await expect(
      repository.updateBranding("organization-id", null),
    ).resolves.toMatchObject({ id: "organization-id", logo_url: null });

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("SET logo_url = $1"),
      [null, "organization-id"],
    );
  });
});
