import { OrganizationMembersRepository } from "./organization-members.repository";
import { OrganizationMembersService } from "./organization-members.service";

describe("Ownership transfer", () => {
  const repository = {
    transaction: jest.fn(),
    organization: jest.fn(),
    actor: jest.fn(),
    member: jest.fn(),
    ownerMembershipIds: jest.fn(),
    assignedBusinesses: jest.fn(),
    changeRole: jest.fn(),
    audit: jest.fn(),
  };
  const service = new OrganizationMembersService(
    repository as unknown as OrganizationMembersRepository,
  );
  const input = {
    currentOwnerMembershipId: "owner",
    newOwnerMembershipId: "next",
  };
  const client = {};
  const owner = {
    id: "owner",
    user_id: "old-user",
    role: "OWNER",
    status: "ACTIVE",
    user_status: "ACTIVE",
  };
  const next = {
    id: "next",
    user_id: "new-user",
    role: "EMPLOYEE",
    status: "ACTIVE",
    user_status: "ACTIVE",
  };

  beforeEach(() => {
    Object.values(repository).forEach((mock) => mock.mockReset());
    repository.transaction.mockImplementation(
      (operation: (client: object) => unknown) => operation(client),
    );
    repository.organization.mockResolvedValue({ status: "ACTIVE" });
    repository.actor.mockResolvedValue({ is_superadmin: true, role: null });
    repository.member.mockImplementation(
      (_client: object, _org: string, id: string) =>
        Promise.resolve(id === "owner" ? owner : next),
    );
    repository.ownerMembershipIds.mockResolvedValue(["owner"]);
    repository.assignedBusinesses.mockResolvedValue(["business"]);
  });

  it.each(["ADMIN", "MANAGER", "EMPLOYEE"])(
    "transfers to %s with platform auditing and no tenant role requirement",
    async (role) => {
      repository.member
        .mockResolvedValueOnce(owner)
        .mockResolvedValueOnce({ ...next, role });
      const result = await service.transferOwnership("org", input, "platform");
      expect(repository.organization).toHaveBeenCalledWith(client, "org", true);
      expect(repository.changeRole).toHaveBeenNthCalledWith(
        1,
        client,
        "org",
        owner,
        "ADMIN",
        [],
      );
      expect(repository.changeRole).toHaveBeenNthCalledWith(
        2,
        client,
        "org",
        expect.objectContaining({ id: "next" }),
        "OWNER",
        [],
      );
      expect(result.newOwner.role).toBe("OWNER");
      expect(repository.audit).toHaveBeenCalledWith(
        client,
        "org",
        "platform",
        true,
        "ORGANIZATION_OWNERSHIP_TRANSFERRED",
        "ORGANIZATION",
        "org",
        expect.any(Object),
        result,
      );
    },
  );

  it.each(["OWNER", "ADMIN", "MANAGER", "EMPLOYEE"])(
    "rejects non-superadmin %s even without the controller guard",
    async (role) => {
      repository.actor.mockResolvedValue({ is_superadmin: false, role });
      await expect(
        service.transferOwnership("org", input, "actor"),
      ).rejects.toMatchObject({ status: 403 });
      expect(repository.changeRole).not.toHaveBeenCalled();
    },
  );

  it.each([
    { ids: [] },
    { ids: ["someone-else"] },
    { ids: ["owner", "extra-owner"] },
  ])("rejects changed or ambiguous ownership %j", async ({ ids }) => {
    repository.ownerMembershipIds.mockResolvedValue(ids);
    await expect(
      service.transferOwnership("org", input, "platform"),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.changeRole).not.toHaveBeenCalled();
  });

  it.each([
    { status: "SUSPENDED" },
    { status: "INVITED" },
    { user_status: "BLOCKED" },
    { role: "CLIENT" },
  ])("rejects ineligible recipient %j", async (override) => {
    repository.member
      .mockResolvedValueOnce(owner)
      .mockResolvedValueOnce({ ...next, ...override });
    await expect(
      service.transferOwnership("org", input, "platform"),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.changeRole).not.toHaveBeenCalled();
  });

  it("does not accept a member outside the organization or a suspended organization", async () => {
    repository.member
      .mockResolvedValueOnce(owner)
      .mockResolvedValueOnce(undefined);
    await expect(
      service.transferOwnership("org", input, "platform"),
    ).rejects.toMatchObject({ status: 404 });
    repository.organization.mockResolvedValue({ status: "SUSPENDED" });
    await expect(
      service.transferOwnership("org", input, "platform"),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.changeRole).not.toHaveBeenCalled();
  });

  it("rejects transferring to the same member", async () => {
    await expect(
      service.transferOwnership(
        "org",
        { ...input, newOwnerMembershipId: "OWNER" },
        "platform",
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(repository.changeRole).not.toHaveBeenCalled();
  });

  it("propagates audit failure to the transaction for rollback", async () => {
    repository.audit.mockRejectedValue(new Error("audit failed"));
    await expect(
      service.transferOwnership("org", input, "platform"),
    ).rejects.toThrow("audit failed");
  });
});
