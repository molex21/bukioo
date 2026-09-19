import { OrganizationsController } from "./organizations.controller";
import { OrganizationMembersService } from "./organization-members.service";
import { SuperadminController } from "../superadmin/superadmin.controller";

describe("Member access routes", () => {
  const members = { updateStatus: jest.fn(), updateBusinesses: jest.fn() };
  const tenant = new OrganizationsController(
    {} as never,
    members as unknown as OrganizationMembersService,
  );
  const platform = new SuperadminController(
    {} as never,
    members as unknown as OrganizationMembersService,
  );
  beforeEach(() => jest.clearAllMocks());

  it("uses tenant authorization for organization actions", async () => {
    const status = {
      status: "SUSPENDED",
      expectedStatus: "ACTIVE",
      expectedRole: "EMPLOYEE",
    } as const;
    const businesses = {
      businessIds: [],
      expectedBusinessIds: [],
      expectedRole: "EMPLOYEE" as const,
    };
    await tenant.updateMemberStatus("org", "member", status, "actor");
    await tenant.updateMemberBusinesses("org", "member", businesses, "actor");
    expect(members.updateStatus).toHaveBeenCalledWith(
      "org",
      "member",
      status,
      "actor",
    );
    expect(members.updateBusinesses).toHaveBeenCalledWith(
      "org",
      "member",
      businesses,
      "actor",
    );
  });

  it("uses explicit platform authorization for superadmin actions", async () => {
    const status = {
      status: "ACTIVE",
      expectedStatus: "SUSPENDED",
      expectedRole: "MANAGER",
    } as const;
    const businesses = {
      businessIds: [],
      expectedBusinessIds: [],
      expectedRole: "MANAGER" as const,
    };
    await platform.updateMemberStatus("org", "member", status, "actor");
    await platform.updateMemberBusinesses("org", "member", businesses, "actor");
    expect(members.updateStatus).toHaveBeenCalledWith(
      "org",
      "member",
      status,
      "actor",
      true,
    );
    expect(members.updateBusinesses).toHaveBeenCalledWith(
      "org",
      "member",
      businesses,
      "actor",
      true,
    );
  });
});
