import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Response } from "express";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;

  const authServiceMock = {
    register: jest.fn(),
    onboard: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
    updateMyProfile: jest.fn(),
    requestEmailVerification: jest.fn(),
    verifyEmail: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    verifyPasswordResetCode: jest.fn(),
    createTwoFactorSetup: jest.fn(),
    enableTwoFactor: jest.fn(),
    verifyTwoFactor: jest.fn(),
    verifyInitialEmail: jest.fn(),
    setInitialPassword: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn(),
  };

  const jwtServiceMock = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("delegates self profile updates using the authenticated user", async () => {
    const dto = { firstName: "Grace", phone: "600000001" };
    const request = { userId: "user-id" };
    authServiceMock.updateMyProfile.mockResolvedValue({ firstName: "Grace" });

    await expect(
      controller.updateMyProfile(dto, request as never),
    ).resolves.toEqual({
      firstName: "Grace",
    });
    expect(authServiceMock.updateMyProfile).toHaveBeenCalledWith(
      "user-id",
      dto,
    );
  });

  it("delegates onboarding requests to the auth service", async () => {
    const onboardDto = {
      email: "owner@example.com",
      organizationName: "Example Company",
      organizationSlug: "example-company",
      timezone: "Atlantic/Canary",
    };
    const response = {
      user: { id: "user-id", email: onboardDto.email },
      organization: {
        id: "organization-id",
        slug: onboardDto.organizationSlug,
      },
      membership: { role: "OWNER" },
    };
    authServiceMock.onboard.mockResolvedValue(response);

    await expect(
      controller.onboard(onboardDto, "onboarding-secret"),
    ).resolves.toEqual(response);
    expect(authServiceMock.onboard).toHaveBeenCalledWith(
      onboardDto,
      "onboarding-secret",
    );
  });

  it("stores the refresh token in an HttpOnly cookie", async () => {
    const loginDto = {
      email: "user@example.com",
      password: "a-secure-password",
    };
    const response = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      expiresIn: 900,
    };
    const cookie = jest.fn();
    const httpResponse = {
      cookie,
    } as unknown as Response;
    authServiceMock.login.mockResolvedValue(response);
    configServiceMock.get.mockReturnValue("development");

    await expect(
      controller.login(loginDto, "test-agent", "127.0.0.1", httpResponse),
    ).resolves.toEqual({
      accessToken: "access-token",
      tokenType: "Bearer",
      expiresIn: 900,
    });
    expect(authServiceMock.login).toHaveBeenCalledWith(loginDto, {
      userAgent: "test-agent",
      ipAddress: "127.0.0.1",
    });
    expect(cookie).toHaveBeenCalledWith(
      "refresh_token",
      "refresh-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      }),
    );
  });

  it("marks every staff authentication cookie as Secure in production", () => {
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const response = { cookie, clearCookie } as unknown as Response;
    configServiceMock.get.mockReturnValue("production");
    const cookieController = controller as unknown as {
      setRefreshTokenCookie(response: Response, token: string): void;
      clearRefreshTokenCookie(response: Response): void;
      setEmailVerificationAttemptCookie(
        response: Response,
        token: string,
      ): void;
      clearEmailVerificationAttemptCookie(response: Response): void;
      setPasswordActivationAttemptCookie(
        response: Response,
        token: string,
      ): void;
      clearPasswordActivationAttemptCookie(response: Response): void;
      setTwoFactorAttemptCookie(response: Response, token: string): void;
      clearTwoFactorAttemptCookie(response: Response): void;
    };

    cookieController.setRefreshTokenCookie(response, "refresh-token");
    cookieController.clearRefreshTokenCookie(response);
    cookieController.setEmailVerificationAttemptCookie(response, "email-token");
    cookieController.clearEmailVerificationAttemptCookie(response);
    cookieController.setPasswordActivationAttemptCookie(
      response,
      "password-token",
    );
    cookieController.clearPasswordActivationAttemptCookie(response);
    cookieController.setTwoFactorAttemptCookie(response, "two-factor-token");
    cookieController.clearTwoFactorAttemptCookie(response);

    for (const [, , options] of cookie.mock.calls) {
      expect(options).toEqual(
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          secure: true,
        }),
      );
    }
    for (const [, options] of clearCookie.mock.calls) {
      expect(options).toEqual(
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          secure: true,
        }),
      );
    }
  });

  it("pauses a temporary-password login and stores its attempt in a cookie", async () => {
    const loginDto = {
      email: "user@example.com",
      password: "temporary-password",
    };
    const cookie = jest.fn();
    const status = jest.fn();
    const httpResponse = {
      cookie,
      status,
    } as unknown as Response;
    authServiceMock.login.mockResolvedValue({
      emailVerificationRequired: true,
      verificationAttemptToken: "verification-attempt-token",
    });
    configServiceMock.get.mockReturnValue("development");

    await expect(
      controller.login(loginDto, "test-agent", "127.0.0.1", httpResponse),
    ).resolves.toEqual({ emailVerificationRequired: true });

    expect(status).toHaveBeenCalledWith(202);
    expect(cookie).toHaveBeenCalledWith(
      "email_verification_attempt",
      "verification-attempt-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/api/v1/auth/activate/verify",
      }),
    );
  });

  it("resumes password activation with a scoped cookie after email verification", async () => {
    const cookie = jest.fn();
    const status = jest.fn();
    const httpResponse = { cookie, status } as unknown as Response;
    authServiceMock.login.mockResolvedValue({
      passwordChangeRequired: true,
      passwordActivationAttemptToken: "password-activation-token",
    });
    configServiceMock.get.mockReturnValue("development");

    await expect(
      controller.login(
        { email: "user@example.com", password: "temporary-password" },
        "test-agent",
        "127.0.0.1",
        httpResponse,
      ),
    ).resolves.toEqual({ passwordChangeRequired: true });

    expect(status).toHaveBeenCalledWith(202);
    expect(cookie).toHaveBeenCalledWith(
      "password_activation_attempt",
      "password-activation-token",
      expect.objectContaining({
        httpOnly: true,
        path: "/api/v1/auth/activate/password",
      }),
    );
  });

  it("pauses a 2FA login and stores its attempt in a scoped cookie", async () => {
    const cookie = jest.fn();
    const status = jest.fn();
    const httpResponse = { cookie, status } as unknown as Response;
    authServiceMock.login.mockResolvedValue({
      twoFactorRequired: true,
      twoFactorAttemptToken: "two-factor-attempt-token",
    });
    configServiceMock.get.mockReturnValue("development");

    await expect(
      controller.login(
        { email: "user@example.com", password: "a-secure-password" },
        "test-agent",
        "127.0.0.1",
        httpResponse,
      ),
    ).resolves.toEqual({ twoFactorRequired: true });

    expect(status).toHaveBeenCalledWith(202);
    expect(cookie).toHaveBeenCalledWith(
      "two_factor_attempt",
      "two-factor-attempt-token",
      expect.objectContaining({
        httpOnly: true,
        path: "/api/v1/auth/2fa",
      }),
    );
  });

  it("rotates the refresh token from the request cookie", async () => {
    const response = {
      accessToken: "next-access-token",
      refreshToken: "next-refresh-token",
      tokenType: "Bearer",
      expiresIn: 900,
    };
    const cookie = jest.fn();
    const httpResponse = {
      cookie,
    } as unknown as Response;
    authServiceMock.refresh.mockResolvedValue(response);
    configServiceMock.get.mockReturnValue("development");

    await expect(
      controller.refresh(
        "other=value; refresh_token=current-refresh-token",
        httpResponse,
      ),
    ).resolves.toEqual({
      accessToken: "next-access-token",
      tokenType: "Bearer",
      expiresIn: 900,
    });

    expect(authServiceMock.refresh).toHaveBeenCalledWith(
      "current-refresh-token",
    );
    expect(cookie).toHaveBeenCalledWith(
      "refresh_token",
      "next-refresh-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      }),
    );
  });

  it("revokes the refresh-token session and clears its cookie on logout", async () => {
    const clearCookie = jest.fn();
    const httpResponse = {
      clearCookie,
    } as unknown as Response;
    authServiceMock.logout.mockResolvedValue(undefined);
    configServiceMock.get.mockReturnValue("development");

    await expect(
      controller.logout(
        "other=value; refresh_token=current-refresh-token",
        httpResponse,
      ),
    ).resolves.toBeUndefined();

    expect(authServiceMock.logout).toHaveBeenCalledWith(
      "current-refresh-token",
    );
    expect(clearCookie).toHaveBeenCalledWith(
      "refresh_token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/api/v1/auth",
      }),
    );
  });

  it("returns the authenticated user profile", async () => {
    const profile = {
      id: "user-id",
      email: "user@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      emailVerified: true,
      preferredLocale: "es",
      isSuperadmin: false,
      status: "ACTIVE",
      createdAt: new Date("2026-08-22T10:00:00.000Z"),
    };
    authServiceMock.me.mockResolvedValue(profile);

    await expect(controller.me({ userId: profile.id })).resolves.toEqual(
      profile,
    );
    expect(authServiceMock.me).toHaveBeenCalledWith(profile.id);
  });

  it("accepts an email-verification request without revealing user state", async () => {
    const requestDto = { email: "user@example.com" };
    authServiceMock.requestEmailVerification.mockResolvedValue(undefined);

    await expect(
      controller.requestEmailVerification(requestDto),
    ).resolves.toEqual({ status: "accepted" });
    expect(authServiceMock.requestEmailVerification).toHaveBeenCalledWith(
      requestDto,
    );
  });

  it("delegates email-token verification to the auth service", async () => {
    const verifyEmailDto = { token: "verification-token" };
    authServiceMock.verifyEmail.mockResolvedValue({ emailVerified: true });

    await expect(controller.verifyEmail(verifyEmailDto)).resolves.toEqual({
      emailVerified: true,
    });
    expect(authServiceMock.verifyEmail).toHaveBeenCalledWith(verifyEmailDto);
  });

  it("accepts a password-reset request without revealing user state", async () => {
    const forgotPasswordDto = { email: "user@example.com" };
    authServiceMock.requestPasswordReset.mockResolvedValue(undefined);

    await expect(
      controller.requestPasswordReset(forgotPasswordDto),
    ).resolves.toEqual({ status: "accepted" });
    expect(authServiceMock.requestPasswordReset).toHaveBeenCalledWith(
      forgotPasswordDto,
    );
  });

  it("delegates a password reset to the auth service", async () => {
    const resetPasswordDto = {
      token: "123456",
      password: "new-secure-password",
    };
    authServiceMock.resetPassword.mockResolvedValue(undefined);

    await expect(controller.resetPassword(resetPasswordDto)).resolves.toEqual({
      passwordReset: true,
    });
    expect(authServiceMock.resetPassword).toHaveBeenCalledWith(
      resetPasswordDto,
    );
  });

  it("verifies a password-reset code without changing the password", async () => {
    const verifyPasswordResetDto = { token: "123456" };
    authServiceMock.verifyPasswordResetCode.mockResolvedValue(undefined);

    await expect(
      controller.verifyPasswordResetCode(verifyPasswordResetDto),
    ).resolves.toEqual({ codeVerified: true });
    expect(authServiceMock.verifyPasswordResetCode).toHaveBeenCalledWith(
      verifyPasswordResetDto,
    );
  });

  it("verifies the email code and exchanges its cookie for password activation", async () => {
    const verifyEmailDto = { token: "verification-token" };
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const httpResponse = { cookie, clearCookie } as unknown as Response;
    authServiceMock.verifyInitialEmail.mockResolvedValue(
      "password-attempt-token",
    );
    configServiceMock.get.mockReturnValue("development");

    await expect(
      controller.verifyInitialEmail(
        verifyEmailDto,
        "email_verification_attempt=verification-attempt-token",
        httpResponse,
      ),
    ).resolves.toEqual({ emailVerified: true, passwordChangeRequired: true });

    expect(authServiceMock.verifyInitialEmail).toHaveBeenCalledWith(
      verifyEmailDto,
      "verification-attempt-token",
    );
    expect(cookie).toHaveBeenCalledWith(
      "password_activation_attempt",
      "password-attempt-token",
      expect.objectContaining({ path: "/api/v1/auth/activate/password" }),
    );
    expect(clearCookie).toHaveBeenCalledWith(
      "email_verification_attempt",
      expect.objectContaining({ path: "/api/v1/auth/activate/verify" }),
    );
  });

  it("sets the initial password, creates a session and clears its attempt cookie", async () => {
    const setInitialPasswordDto = { password: "a-new-secure-password" };
    const response = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      expiresIn: 900,
    };
    const cookie = jest.fn();
    const clearCookie = jest.fn();
    const httpResponse = {
      cookie,
      clearCookie,
    } as unknown as Response;
    authServiceMock.setInitialPassword.mockResolvedValue(response);
    configServiceMock.get.mockReturnValue("development");

    await expect(
      controller.setInitialPassword(
        setInitialPasswordDto,
        "password_activation_attempt=password-attempt-token",
        "test-agent",
        "127.0.0.1",
        httpResponse,
      ),
    ).resolves.toEqual({
      accessToken: "access-token",
      tokenType: "Bearer",
      expiresIn: 900,
    });

    expect(authServiceMock.setInitialPassword).toHaveBeenCalledWith(
      setInitialPasswordDto,
      "password-attempt-token",
      { userAgent: "test-agent", ipAddress: "127.0.0.1" },
    );
    expect(cookie).toHaveBeenCalledWith(
      "refresh_token",
      "refresh-token",
      expect.objectContaining({ httpOnly: true, path: "/api/v1/auth" }),
    );
    expect(clearCookie).toHaveBeenCalledWith(
      "password_activation_attempt",
      expect.objectContaining({
        httpOnly: true,
        path: "/api/v1/auth/activate/password",
      }),
    );
  });
});
