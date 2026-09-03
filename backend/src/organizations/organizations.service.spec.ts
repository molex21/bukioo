import { OrganizationsRepository } from "./organizations.repository";
import { OrganizationsService } from "./organizations.service";

describe("OrganizationsService", () => {
  const repositoryMock = { updateBranding: jest.fn() };
  const service = new OrganizationsService(
    repositoryMock as unknown as OrganizationsRepository,
  );

  afterEach(() => repositoryMock.updateBranding.mockReset());

  it("returns the organization branding in the API contract", async () => {
    const updatedAt = new Date("2026-09-03T15:00:00.000Z");
    repositoryMock.updateBranding.mockResolvedValue({
      id: "organization-id",
      name: "Example Company",
      slug: "example-company",
      logo_url: "https://cdn.example.com/logo.png",
      primary_color: "#112233",
      updated_at: updatedAt,
    });

    await expect(
      service.updateBranding("organization-id", {
        logoUrl: "https://cdn.example.com/logo.png",
      }),
    ).resolves.toEqual({
      id: "organization-id",
      name: "Example Company",
      slug: "example-company",
      logoUrl: "https://cdn.example.com/logo.png",
      primaryColor: "#112233",
      updatedAt,
    });
  });

  it("requires logoUrl and rejects a missing organization", async () => {
    await expect(
      service.updateBranding("organization-id", {}),
    ).rejects.toMatchObject({ status: 400 });

    repositoryMock.updateBranding.mockResolvedValue(null);

    await expect(
      service.updateBranding("organization-id", { logoUrl: null }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
