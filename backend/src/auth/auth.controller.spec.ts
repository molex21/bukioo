import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
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
  };

  const configServiceMock = {
    get: jest.fn(),
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
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("delegates onboarding requests to the auth service", async () => {
    const onboardDto = {
      email: "owner@example.com",
      password: "a-secure-password",
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

    await expect(controller.onboard(onboardDto)).resolves.toEqual(response);
    expect(authServiceMock.onboard).toHaveBeenCalledWith(onboardDto);
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
});
