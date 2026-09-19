import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

describe("OrganizationsController", () => {
  const organizationsService = { updateBranding: jest.fn() };
  const controller = new OrganizationsController(
    organizationsService as unknown as OrganizationsService,
    { list: jest.fn(), updateRole: jest.fn() } as never,
  );

  afterEach(() => organizationsService.updateBranding.mockReset());

  it("delegates organization branding updates", async () => {
    organizationsService.updateBranding.mockResolvedValue({
      id: "organization-id",
      logoUrl: "https://cdn.example.com/logo.png",
    });

    await expect(
      controller.updateBranding("organization-id", {
        logoUrl: "https://cdn.example.com/logo.png",
      }),
    ).resolves.toMatchObject({ id: "organization-id" });

    expect(organizationsService.updateBranding).toHaveBeenCalledWith(
      "organization-id",
      { logoUrl: "https://cdn.example.com/logo.png" },
    );
  });
});
