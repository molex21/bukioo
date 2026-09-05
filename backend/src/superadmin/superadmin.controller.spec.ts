import { SuperadminController } from "./superadmin.controller";
import { SuperadminService } from "./superadmin.service";

describe("SuperadminController", () => {
  const service = {
    listOrganizationBusinesses: jest.fn(),
    getOrganizationBusiness: jest.fn(),
    listBusinessEmployees: jest.fn(),
  };
  const controller = new SuperadminController(
    service as unknown as SuperadminService,
  );

  beforeEach(() => Object.values(service).forEach((mock) => mock.mockReset()));

  it("delegates organization business navigation using scoped IDs", async () => {
    const filters = { status: "ACTIVE" as const, limit: 25, offset: 0 };
    await controller.listOrganizationBusinesses("organization-id", filters);
    await controller.getOrganizationBusiness("organization-id", "business-id");
    await controller.listBusinessEmployees(
      "organization-id",
      "business-id",
      filters,
    );

    expect(service.listOrganizationBusinesses).toHaveBeenCalledWith(
      "organization-id",
      filters,
    );
    expect(service.getOrganizationBusiness).toHaveBeenCalledWith(
      "organization-id",
      "business-id",
    );
    expect(service.listBusinessEmployees).toHaveBeenCalledWith(
      "organization-id",
      "business-id",
      filters,
    );
  });
});
