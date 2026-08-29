import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { CustomerAuthRepository } from "./customer-auth.repository";
import {
  CustomerAuthenticatedRequest,
  CustomerJwtAuthGuard,
} from "./customer-jwt-auth.guard";

describe("CustomerJwtAuthGuard", () => {
  const jwt = { verifyAsync: jest.fn() };
  const config = { getOrThrow: jest.fn() };
  const repository = {
    findOrganization: jest.fn(),
    findActiveAccountById: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    config.getOrThrow.mockReturnValue("access-secret");
    repository.findOrganization.mockResolvedValue({ id: "organization-id" });
    repository.findActiveAccountById.mockResolvedValue({
      id: "account-id",
      organization_id: "organization-id",
      status: "ACTIVE",
    });
  });

  it("accepts a customer token for the organization in the route", async () => {
    const request = {
      headers: { authorization: "Bearer access-token" },
      params: { organizationSlug: "mi-negocio" },
    } as CustomerAuthenticatedRequest;
    jwt.verifyAsync.mockResolvedValue({
      sub: "account-id",
      organizationId: "organization-id",
      type: "CUSTOMER",
    });
    const guard = new CustomerJwtAuthGuard(
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      repository as unknown as CustomerAuthRepository,
    );

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.customer).toEqual({
      id: "account-id",
      organizationId: "organization-id",
    });
  });

  it("rejects a token belonging to another organization", async () => {
    const request = {
      headers: { authorization: "Bearer access-token" },
      params: { organizationSlug: "mi-negocio" },
    } as CustomerAuthenticatedRequest;
    jwt.verifyAsync.mockResolvedValue({
      sub: "account-id",
      organizationId: "other-organization-id",
      type: "CUSTOMER",
    });
    const guard = new CustomerJwtAuthGuard(
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      repository as unknown as CustomerAuthRepository,
    );

    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

function contextFor(request: CustomerAuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}
