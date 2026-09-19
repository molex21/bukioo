import { OrganizationMembersRepository } from "./organization-members.repository";
import { OrganizationMembersService } from "./organization-members.service";
import type {
  UpdateMemberBusinessesDto,
  UpdateMemberStatusDto,
} from "./dto/update-member-access.dto";

describe("Organization member access", () => {
  const repository = {
    transaction: jest.fn(),
    organization: jest.fn(),
    actor: jest.fn(),
    member: jest.fn(),
    assignedBusinesses: jest.fn(),
    business: jest.fn(),
    changeStatus: jest.fn(),
    replaceBusinesses: jest.fn(),
    audit: jest.fn(),
  };
  const service = new OrganizationMembersService(
    repository as unknown as OrganizationMembersRepository,
  );
  const client = {};
  const member = {
    id: "member",
    user_id: "target",
    role: "EMPLOYEE",
    status: "ACTIVE",
    user_status: "ACTIVE",
  };
  const suspend: UpdateMemberStatusDto = {
    status: "SUSPENDED",
    expectedStatus: "ACTIVE",
    expectedRole: "EMPLOYEE",
  };
  const assignments: UpdateMemberBusinessesDto = {
    businessIds: [],
    expectedBusinessIds: ["company"],
    expectedRole: "EMPLOYEE",
  };

  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.transaction.mockImplementation(
      (fn: (client: object) => unknown) => fn(client),
    );
    repository.organization.mockResolvedValue({ status: "ACTIVE" });
    repository.actor.mockResolvedValue({ role: "OWNER", is_superadmin: true });
    repository.member.mockResolvedValue({ ...member });
    repository.assignedBusinesses.mockResolvedValue(["company"]);
    repository.business.mockResolvedValue({ id: "company", status: "ACTIVE" });
  });

  it.each([false, true])(
    "suspends only the organization membership, platform=%s",
    async (platform) => {
      const result = await service.updateStatus(
        "org",
        "member",
        suspend,
        "actor",
        platform,
      );
      expect(result.status).toBe("SUSPENDED");
      expect(repository.changeStatus).toHaveBeenCalledWith(
        client,
        "org",
        "member",
        "SUSPENDED",
      );
      expect(repository.replaceBusinesses).not.toHaveBeenCalled();
      expect(repository.organization).toHaveBeenCalledWith(client, "org", true);
      expect(repository.audit).toHaveBeenCalledWith(
        client,
        "org",
        "actor",
        platform,
        "MEMBER_ACCESS_SUSPENDED",
        "ORGANIZATION_MEMBERSHIP",
        "member",
        { status: "ACTIVE" },
        expect.objectContaining({ status: "SUSPENDED", userId: "target" }),
      );
    },
  );

  it("restores access without changing companies or employee state", async () => {
    repository.member.mockResolvedValue({ ...member, status: "SUSPENDED" });
    await service.updateStatus(
      "org",
      "member",
      { ...suspend, status: "ACTIVE", expectedStatus: "SUSPENDED" },
      "actor",
    );
    expect(repository.changeStatus).toHaveBeenCalledWith(
      client,
      "org",
      "member",
      "ACTIVE",
    );
    expect(repository.replaceBusinesses).not.toHaveBeenCalled();
    expect(repository.audit).toHaveBeenCalledWith(
      client,
      "org",
      "actor",
      false,
      "MEMBER_ACCESS_RESTORED",
      "ORGANIZATION_MEMBERSHIP",
      "member",
      expect.any(Object),
      expect.any(Object),
    );
  });

  it.each([false, true])(
    "rejects self-suspension even in platform=%s",
    async (platform) => {
      repository.member.mockResolvedValue({ ...member, user_id: "actor" });
      await expect(
        service.updateStatus("org", "member", suspend, "actor", platform),
      ).rejects.toMatchObject({ status: 403 });
      expect(repository.changeStatus).not.toHaveBeenCalled();
    },
  );

  it.each(["OWNER", "CLIENT"])("protects %s membership", async (role) => {
    repository.member.mockResolvedValue({ ...member, role });
    await expect(
      service.updateStatus("org", "member", suspend, "actor", true),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service.updateBusinesses("org", "member", assignments, "actor", true),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("restricts tenant admins to employees and managers", async () => {
    repository.actor.mockResolvedValue({ role: "ADMIN", is_superadmin: false });
    repository.member.mockResolvedValue({ ...member, role: "ADMIN" });
    await expect(
      service.updateStatus(
        "org",
        "member",
        { ...suspend, expectedRole: "ADMIN" },
        "actor",
      ),
    ).rejects.toMatchObject({ status: 403 });
    repository.member.mockResolvedValue({ ...member, role: "MANAGER" });
    await expect(
      service.updateStatus(
        "org",
        "member",
        { ...suspend, expectedRole: "MANAGER" },
        "actor",
      ),
    ).resolves.toMatchObject({ status: "SUSPENDED" });
  });

  it("allows owner and platform to suspend administrators", async () => {
    repository.member.mockResolvedValue({ ...member, role: "ADMIN" });
    for (const platform of [false, true])
      await expect(
        service.updateStatus(
          "org",
          "member",
          { ...suspend, expectedRole: "ADMIN" },
          "actor",
          platform,
        ),
      ).resolves.toMatchObject({ role: "ADMIN" });
  });

  it.each(["EMPLOYEE", "MANAGER", null])(
    "rejects access management by role %s",
    async (role) => {
      repository.actor.mockResolvedValue({ role, is_superadmin: false });
      await expect(
        service.updateStatus("org", "member", suspend, "actor"),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        service.updateBusinesses("org", "member", assignments, "actor"),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        service.updateStatus("org", "member", suspend, "actor", true),
      ).rejects.toMatchObject({ status: 403 });
    },
  );

  it("does not activate invitations or globally suspended accounts", async () => {
    repository.member.mockResolvedValue({ ...member, status: "INVITED" });
    await expect(
      service.updateStatus("org", "member", suspend, "actor"),
    ).rejects.toMatchObject({ status: 409 });
    repository.member.mockResolvedValue({
      ...member,
      status: "SUSPENDED",
      user_status: "SUSPENDED",
    });
    await expect(
      service.updateStatus(
        "org",
        "member",
        { ...suspend, status: "ACTIVE", expectedStatus: "SUSPENDED" },
        "actor",
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it.each([{ status: "SUSPENDED" }, { role: "MANAGER" }])(
    "rejects stale status or role %j",
    async (patch) => {
      repository.member.mockResolvedValue({ ...member, ...patch });
      await expect(
        service.updateStatus("org", "member", suspend, "actor"),
      ).rejects.toMatchObject({ status: 409 });
      expect(repository.changeStatus).not.toHaveBeenCalled();
    },
  );

  it("rejects resources outside the organization", async () => {
    repository.member.mockResolvedValue(undefined);
    await expect(
      service.updateStatus("org", "foreign", suspend, "actor"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service.updateBusinesses("org", "foreign", assignments, "actor"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("can remove every company without changing role or status", async () => {
    expect(
      await service.updateBusinesses("org", "member", assignments, "actor"),
    ).toMatchObject({ businessIds: [], role: "EMPLOYEE", status: "ACTIVE" });
    expect(repository.replaceBusinesses).toHaveBeenCalledWith(
      client,
      "org",
      "target",
      [],
    );
    expect(repository.changeStatus).not.toHaveBeenCalled();
  });

  it("can prepare companies for a suspended member without restoring access", async () => {
    repository.member.mockResolvedValue({ ...member, status: "SUSPENDED" });
    await expect(
      service.updateBusinesses("org", "member", assignments, "actor"),
    ).resolves.toMatchObject({ status: "SUSPENDED" });
    expect(repository.changeStatus).not.toHaveBeenCalled();
  });

  it("rejects a changed role or list of companies", async () => {
    await expect(
      service.updateBusinesses(
        "org",
        "member",
        { ...assignments, expectedBusinessIds: [] },
        "actor",
      ),
    ).rejects.toMatchObject({ status: 409 });
    repository.member.mockResolvedValue({ ...member, role: "MANAGER" });
    await expect(
      service.updateBusinesses("org", "member", assignments, "actor"),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.replaceBusinesses).not.toHaveBeenCalled();
  });

  it("rejects foreign company assignments", async () => {
    repository.business.mockResolvedValue(undefined);
    await expect(
      service.updateBusinesses(
        "org",
        "member",
        { ...assignments, businessIds: ["foreign"] },
        "actor",
      ),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("can retain or remove suspended companies but cannot grant new ones", async () => {
    repository.business.mockResolvedValue({
      id: "company",
      status: "SUSPENDED",
    });
    await expect(
      service.updateBusinesses(
        "org",
        "member",
        { ...assignments, businessIds: ["company"] },
        "actor",
      ),
    ).resolves.toMatchObject({ businessIds: ["company"] });
    await expect(
      service.updateBusinesses(
        "org",
        "member",
        { ...assignments, businessIds: ["new-company"] },
        "actor",
      ),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("does not duplicate audit on identical requests", async () => {
    await service.updateStatus(
      "org",
      "member",
      { ...suspend, status: "ACTIVE" },
      "actor",
    );
    await service.updateBusinesses(
      "org",
      "member",
      { ...assignments, businessIds: ["company"] },
      "actor",
    );
    expect(repository.audit).not.toHaveBeenCalled();
  });

  it("rejects mutations on a suspended organization", async () => {
    repository.organization.mockResolvedValue({ status: "SUSPENDED" });
    await expect(
      service.updateStatus("org", "member", suspend, "actor", true),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service.updateBusinesses("org", "member", assignments, "actor", true),
    ).rejects.toMatchObject({ status: 409 });
  });
});
