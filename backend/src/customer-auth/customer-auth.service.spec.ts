import * as argon2 from "argon2";
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { CustomerAuthRepository } from "./customer-auth.repository";
import { CustomerAuthService } from "./customer-auth.service";
import { LoginProtectionRepository } from "../auth/login-protection.repository";

describe("CustomerAuthService", () => {
  const repository = {
    findOrganization: jest.fn(),
    findAccount: jest.fn(),
    findAccountForLogin: jest.fn(),
    createAccount: jest.fn(),
    linkCustomers: jest.fn(),
    createSession: jest.fn(),
    findActiveSession: jest.fn(),
    rotateSession: jest.fn(),
    revokeSession: jest.fn(),
    findActiveAccountById: jest.fn(),
  };
  const loginProtectionRepository = {
    isCustomerAccountLocked: jest.fn(),
    recordCustomerAccountFailure: jest.fn(),
    clearCustomerAccountFailures: jest.fn(),
  };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const config = { getOrThrow: jest.fn() };
  let service: CustomerAuthService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CustomerAuthService(
      repository as unknown as CustomerAuthRepository,
      jwt as never,
      config as never,
      loginProtectionRepository as unknown as LoginProtectionRepository,
    );
    repository.findOrganization.mockResolvedValue({ id: "organization-id" });
    repository.findAccount.mockResolvedValue(null);
    repository.createAccount.mockResolvedValue({
      id: "account-id",
      organization_id: "organization-id",
      email: "customer@example.com",
      status: "ACTIVE",
    });
    repository.createSession.mockResolvedValue("session-id");
    repository.rotateSession.mockResolvedValue(true);
    repository.findActiveAccountById.mockResolvedValue({
      id: "account-id",
      organization_id: "organization-id",
      email: "customer@example.com",
      status: "ACTIVE",
    });
    jwt.signAsync.mockResolvedValue("access-token");
    config.getOrThrow.mockReturnValue("access-secret");
  });

  it("registers an organization-scoped account and links matching customers", async () => {
    await expect(
      service.register("mi-negocio", {
        email: " CUSTOMER@example.com ",
        password: "password-at-least-12",
      }),
    ).resolves.toEqual(
      expect.objectContaining({ accessToken: "access-token" }),
    );
    expect(repository.linkCustomers).toHaveBeenCalledWith(
      "organization-id",
      "customer@example.com",
      "account-id",
    );
  });

  it("rejects an unknown organization", async () => {
    repository.findOrganization.mockResolvedValue(null);
    await expect(
      service.register("missing", {
        email: "a@b.com",
        password: "password-at-least-12",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects an email already registered in the same organization", async () => {
    repository.findAccount.mockResolvedValue({ id: "existing" });
    await expect(
      service.register("mi-negocio", {
        email: "a@b.com",
        password: "password-at-least-12",
      }),
    ).rejects.toThrow(ConflictException);
    expect(repository.createAccount).not.toHaveBeenCalled();
  });

  it("logs in an active account scoped to the requested organization", async () => {
    repository.findAccountForLogin.mockResolvedValue({
      id: "account-id",
      organization_id: "organization-id",
      email: "customer@example.com",
      status: "ACTIVE",
      password_hash: await argon2.hash("password-at-least-12"),
    });

    await expect(
      service.login("mi-negocio", {
        email: " CUSTOMER@example.com ",
        password: "password-at-least-12",
      }),
    ).resolves.toEqual(
      expect.objectContaining({ accessToken: "access-token" }),
    );
    expect(repository.findAccountForLogin).toHaveBeenCalledWith(
      "organization-id",
      "customer@example.com",
    );
  });

  it("does not reveal whether a customer account exists", async () => {
    repository.findAccountForLogin.mockResolvedValue(null);

    await expect(
      service.login("mi-negocio", {
        email: "customer@example.com",
        password: "password-at-least-12",
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("records a failed customer password and clears failures after a valid login", async () => {
    repository.findAccountForLogin.mockResolvedValue({
      id: "account-id",
      organization_id: "organization-id",
      email: "customer@example.com",
      status: "ACTIVE",
      password_hash: await argon2.hash("correct-password"),
    });

    await expect(
      service.login("mi-negocio", {
        email: "customer@example.com",
        password: "wrong-password",
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(
      loginProtectionRepository.recordCustomerAccountFailure,
    ).toHaveBeenCalledWith("account-id");

    await service.login("mi-negocio", {
      email: "customer@example.com",
      password: "correct-password",
    });
    expect(
      loginProtectionRepository.clearCustomerAccountFailures,
    ).toHaveBeenCalledWith("account-id");
  });

  it("rotates a valid customer refresh session for its organization", async () => {
    const refreshToken = "current-refresh-token";
    jwt.verifyAsync.mockResolvedValue({
      sub: "account-id",
      organizationId: "organization-id",
      sid: "session-id",
      jti: "token-id",
      type: "CUSTOMER",
    });
    repository.findActiveSession.mockResolvedValue({
      id: "session-id",
      customer_account_id: "account-id",
      refresh_token_hash: await argon2.hash(refreshToken),
      account_status: "ACTIVE",
      organization_id: "organization-id",
    });
    jwt.signAsync
      .mockResolvedValueOnce("next-refresh-token")
      .mockResolvedValueOnce("next-access-token");

    await expect(service.refresh("mi-negocio", refreshToken)).resolves.toEqual(
      expect.objectContaining({ accessToken: "next-access-token" }),
    );
    expect(repository.rotateSession).toHaveBeenCalledWith(
      "session-id",
      "account-id",
      expect.any(String),
    );
  });

  it("rejects a refresh token from another organization", async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: "account-id",
      organizationId: "other-organization-id",
      sid: "session-id",
      jti: "token-id",
      type: "CUSTOMER",
    });
    repository.findActiveSession.mockResolvedValue(null);

    await expect(
      service.refresh("mi-negocio", "refresh-token"),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("revokes the current session when a valid customer logs out", async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: "account-id",
      organizationId: "organization-id",
      sid: "session-id",
      jti: "token-id",
      type: "CUSTOMER",
    });

    await service.logout("mi-negocio", "refresh-token");

    expect(repository.revokeSession).toHaveBeenCalledWith(
      "session-id",
      "account-id",
    );
  });

  it("returns only the active customer profile for its organization", async () => {
    await expect(service.me("organization-id", "account-id")).resolves.toEqual({
      id: "account-id",
      email: "customer@example.com",
      organizationId: "organization-id",
    });
  });

  it("rejects an inactive or foreign customer profile", async () => {
    repository.findActiveAccountById.mockResolvedValue(null);

    await expect(service.me("organization-id", "account-id")).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
