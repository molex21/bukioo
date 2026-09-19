import { OrganizationMembersRepository } from "./organization-members.repository";
import { OrganizationMembersService } from "./organization-members.service";

describe("OrganizationMembersService", () => {
  const repository = {
    transaction: jest.fn(),
    organization: jest.fn(),
    actor: jest.fn(),
    member: jest.fn(),
    business: jest.fn(),
    assignedBusinesses: jest.fn(),
    list: jest.fn(),
    changeRole: jest.fn(),
    employee: jest.fn(),
    capacity: jest.fn(),
    createEmployee: jest.fn(),
    audit: jest.fn(),
  };
  const service = new OrganizationMembersService(
    repository as unknown as OrganizationMembersRepository,
  );
  const client = {};
  const member = {
    id: "member",
    user_id: "user",
    role: "EMPLOYEE",
    status: "ACTIVE",
    user_status: "ACTIVE",
    first_name: "Ana",
    last_name: "Diaz",
  };
  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.transaction.mockImplementation(
      (fn: (client: object) => unknown) => fn(client),
    );
    repository.organization.mockResolvedValue({ status: "ACTIVE" });
    repository.actor.mockResolvedValue({ role: "OWNER", is_superadmin: false });
    repository.member.mockResolvedValue({ ...member });
    repository.business.mockResolvedValue({ id: "business", status: "ACTIVE" });
    repository.assignedBusinesses.mockResolvedValue(["business"]);
    repository.capacity.mockResolvedValue({ count: "0", maximum: 10 });
    repository.createEmployee.mockResolvedValue({ id: "employee" });
  });

  it("links an existing owner without changing role or account", async () => {
    repository.member.mockResolvedValue({ ...member, role: "OWNER" });
    await service.linkEmployee("org", "business", { userId: "user" }, "actor");
    expect(repository.changeRole).not.toHaveBeenCalled();
    expect(repository.createEmployee).toHaveBeenCalledWith(
      client,
      "org",
      "business",
      expect.objectContaining({ role: "OWNER" }),
      { userId: "user" },
    );
    expect(repository.audit).toHaveBeenCalledWith(
      client,
      "org",
      "actor",
      false,
      "EMPLOYEE_LINKED",
      "EMPLOYEE",
      "employee",
      null,
      expect.any(Object),
      "business",
    );
  });

  it.each([true, false])(
    "rejects duplicate active or archived employee profiles (%s)",
    async (active) => {
      repository.employee.mockResolvedValue({
        id: "existing",
        is_active: active,
      });
      await expect(
        service.linkEmployee("org", "business", { userId: "user" }, "actor"),
      ).rejects.toMatchObject({ status: 409 });
      expect(repository.createEmployee).not.toHaveBeenCalled();
    },
  );

  it("rejects a user without business access", async () => {
    repository.assignedBusinesses.mockResolvedValue([]);
    await expect(
      service.linkEmployee("org", "business", { userId: "user" }, "actor"),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects inactive staff and full plan capacity", async () => {
    repository.member.mockResolvedValueOnce({
      ...member,
      user_status: "SUSPENDED",
    });
    await expect(
      service.linkEmployee("org", "business", { userId: "user" }, "actor"),
    ).rejects.toMatchObject({ status: 409 });
    repository.capacity.mockResolvedValue({ count: "10", maximum: 10 });
    await expect(
      service.linkEmployee("org", "business", { userId: "user" }, "actor"),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("does not accept account fields alongside userId", async () => {
    await expect(
      service.linkEmployee(
        "org",
        "business",
        { userId: "user", email: "new@example.com" } as never,
        "actor",
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(repository.transaction).not.toHaveBeenCalled();
  });

  it.each(["MANAGER", "EMPLOYEE", null])(
    "rejects management by %s",
    async (role) => {
      repository.actor.mockResolvedValue({ role, is_superadmin: false });
      await expect(service.list("org", {}, "actor")).rejects.toMatchObject({
        status: 403,
      });
      await expect(
        service.updateRole("org", "member", { role: "ADMIN" }, "actor"),
      ).rejects.toMatchObject({ status: 403 });
    },
  );

  it("does not allow the platform flag to bypass a non-superadmin", async () => {
    await expect(service.list("org", {}, "actor", true)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("rechecks actor authority inside the locked transaction", async () => {
    repository.actor.mockResolvedValue({ role: "EMPLOYEE" });
    await expect(
      service.updateRole("org", "member", { role: "ADMIN" }, "actor"),
    ).rejects.toMatchObject({ status: 403 });
    expect(repository.organization).toHaveBeenCalledWith(client, "org", true);
    expect(repository.changeRole).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "never demotes an owner, including platform=%s",
    async (platform) => {
      repository.actor.mockResolvedValue({
        role: "OWNER",
        is_superadmin: true,
      });
      repository.member.mockResolvedValue({ ...member, role: "OWNER" });
      await expect(
        service.updateRole(
          "org",
          "member",
          { role: "ADMIN" },
          "actor",
          platform,
        ),
      ).rejects.toMatchObject({ status: 409 });
    },
  );

  it("rejects admin promotion and self-edits", async () => {
    repository.actor.mockResolvedValue({ role: "ADMIN" });
    await expect(
      service.updateRole("org", "member", { role: "ADMIN" }, "actor"),
    ).rejects.toMatchObject({ status: 403 });
    repository.member.mockResolvedValue({ ...member, user_id: "actor" });
    await expect(
      service.updateRole("org", "member", { role: "MANAGER" }, "actor"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("requires explicit business selection when removing global admin access", async () => {
    repository.member.mockResolvedValue({ ...member, role: "ADMIN" });
    await expect(
      service.updateRole("org", "member", { role: "MANAGER" }, "actor"),
    ).rejects.toMatchObject({ status: 400 });
    const result = await service.updateRole(
      "org",
      "member",
      { role: "MANAGER", businessIds: [] },
      "actor",
    );
    expect(result.businessIds).toEqual([]);
    expect(repository.changeRole).toHaveBeenCalledWith(
      client,
      "org",
      expect.any(Object),
      "MANAGER",
      [],
    );
    expect(repository.audit).toHaveBeenCalled();
  });

  it("does not duplicate audit for a repeated identical update", async () => {
    await service.updateRole("org", "member", { role: "EMPLOYEE" }, "actor");
    expect(repository.changeRole).not.toHaveBeenCalled();
    expect(repository.audit).not.toHaveBeenCalled();
  });

  it("does not allow business assignment across organizations", async () => {
    repository.business.mockResolvedValue(undefined);
    await expect(
      service.updateRole(
        "org",
        "member",
        { role: "MANAGER", businessIds: ["foreign"] },
        "actor",
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
});
