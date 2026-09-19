import { GUARDS_METADATA } from "@nestjs/common/constants";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SuperadminGuard } from "./superadmin.guard";
import { PlatformEmployeesController } from "./platform-employees.controller";
import { PlatformEmployeesService } from "./platform-employees.service";

describe("PlatformEmployeesController", () => {
  const service = { get: jest.fn(), update: jest.fn() };
  const controller = new PlatformEmployeesController(
    service as unknown as PlatformEmployeesService,
  );
  beforeEach(() => jest.clearAllMocks());

  it("requires JWT and superadmin guards on every route", () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PlatformEmployeesController),
    ).toEqual([JwtAuthGuard, SuperadminGuard]);
  });

  it("scopes consultation to all parent IDs and the actor", async () => {
    await controller.get("org", "business", "employee", "actor");
    expect(service.get).toHaveBeenCalledWith(
      "org",
      "business",
      "employee",
      "actor",
    );
  });

  it("passes the validated version and changes to the scoped service", async () => {
    const input = {
      expectedUpdatedAt: "2026-09-13T10:00:00.000Z",
      isActive: false,
    };
    await controller.update("org", "business", "employee", input, "actor");
    expect(service.update).toHaveBeenCalledWith(
      "org",
      "business",
      "employee",
      input,
      "actor",
    );
  });
});
