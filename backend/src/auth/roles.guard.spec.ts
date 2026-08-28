import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { AuthorizationRepository } from "./authorization.repository";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
  let guard: RolesGuard;

  const reflectorMock = { getAllAndOverride: jest.fn() };
  const authorizationRepositoryMock = {
    findOrganizationRole: jest.fn(),
    findBusinessRole: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: reflectorMock },
        {
          provide: AuthorizationRepository,
          useValue: authorizationRepositoryMock,
        },
      ],
    }).compile();

    guard = module.get(RolesGuard);
  });

  afterEach(() => {
    reflectorMock.getAllAndOverride.mockReset();
    authorizationRepositoryMock.findOrganizationRole.mockReset();
    authorizationRepositoryMock.findBusinessRole.mockReset();
  });

  it("allows an owner to manage a business in its organization", async () => {
    reflectorMock.getAllAndOverride
      .mockReturnValueOnce(["OWNER", "ADMIN"])
      .mockReturnValueOnce({
        resource: "business",
        source: "params",
        key: "businessId",
      });
    authorizationRepositoryMock.findBusinessRole.mockResolvedValue("OWNER");
    const request = {
      userId: "user-id",
      params: { businessId: "business-id" },
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(authorizationRepositoryMock.findBusinessRole).toHaveBeenCalledWith(
      "user-id",
      "business-id",
    );
  });

  it("rejects access to a business without an active allowed role", async () => {
    reflectorMock.getAllAndOverride
      .mockReturnValueOnce(["OWNER", "ADMIN"])
      .mockReturnValueOnce({
        resource: "business",
        source: "params",
        key: "businessId",
      });
    authorizationRepositoryMock.findBusinessRole.mockResolvedValue(null);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          userId: "user-id",
          params: { businessId: "other-business-id" },
        }),
      }),
    };

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("does nothing when an endpoint has no role metadata", async () => {
    reflectorMock.getAllAndOverride.mockReturnValueOnce(undefined);
    const context = { getHandler: jest.fn(), getClass: jest.fn() };

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(authorizationRepositoryMock.findBusinessRole).not.toHaveBeenCalled();
  });
});
