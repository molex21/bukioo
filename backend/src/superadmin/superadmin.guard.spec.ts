import { SuperadminGuard } from "./superadmin.guard";
import { SuperadminRepository } from "./superadmin.repository";

describe("SuperadminGuard", () => {
  const repository = { isActiveSuperadmin: jest.fn() };
  const guard = new SuperadminGuard(
    repository as unknown as SuperadminRepository,
  );

  beforeEach(() => repository.isActiveSuperadmin.mockReset());

  it("allows an active superadmin", async () => {
    repository.isActiveSuperadmin.mockResolvedValue(true);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ userId: "user-id" }) }),
    };
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
  });

  it("rejects a regular user", async () => {
    repository.isActiveSuperadmin.mockResolvedValue(false);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ userId: "user-id" }) }),
    };
    await expect(guard.canActivate(context as never)).rejects.toMatchObject({
      status: 403,
    });
  });
});
