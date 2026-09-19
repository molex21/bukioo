import { SuperadminController } from "./superadmin.controller";
import { SuperadminService } from "./superadmin.service";

describe("SuperadminController", () => {
  const service = {
    createOrganization: jest.fn(),
    listOrganizationBusinesses: jest.fn(),
    createOrganizationBusiness: jest.fn(),
    getOrganizationBusiness: jest.fn(),
    listBusinessEmployees: jest.fn(),
    createBusinessEmployee: jest.fn(),
  };
  const members = {
    list: jest.fn(),
    updateRole: jest.fn(),
    transferOwnership: jest.fn(),
  };
  const controller = new SuperadminController(
    service as unknown as SuperadminService,
    members as never,
  );

  beforeEach(() => Object.values(service).forEach((mock) => mock.mockReset()));

  it("passes ownership transfer to the superadmin-only operation", async () => {
    const body = {
      currentOwnerMembershipId: "owner",
      newOwnerMembershipId: "next",
    };
    await controller.transferOwnership("org", body, "actor");
    expect(members.transferOwnership).toHaveBeenCalledWith(
      "org",
      body,
      "actor",
    );
  });

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

  it("delegates platform provisioning to the scoped superadmin service methods", async () => {
    const organization = { email: "owner@example.com" };
    const business = { name: "Centro", slug: "centro" };
    const employee = {
      email: "employee@example.com",
      firstName: "Lucia",
      lastName: "Perez",
      role: "EMPLOYEE" as const,
    };

    await controller.createOrganization(organization as never, "superadmin-id");
    await controller.createOrganizationBusiness(
      "organization-id",
      business,
      "superadmin-id",
    );
    await controller.createBusinessEmployee(
      "organization-id",
      "business-id",
      employee,
      "superadmin-id",
    );

    expect(service.createOrganization).toHaveBeenCalledWith(
      organization,
      "superadmin-id",
    );
    expect(service.createOrganizationBusiness).toHaveBeenCalledWith(
      "organization-id",
      business,
      "superadmin-id",
    );
    expect(service.createBusinessEmployee).toHaveBeenCalledWith(
      "organization-id",
      "business-id",
      employee,
      "superadmin-id",
    );
  });
});
