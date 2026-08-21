import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

jest.mock("argon2", () => ({
  argon2id: 2,
  hash: jest.fn(),
  verify: jest.fn(),
}));

import * as argon2 from "argon2";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { OnboardingRepository } from "./onboarding.repository";
import { UserSessionsRepository } from "./user-sessions.repository";
import { UserRecord, UsersRepository } from "./users.repository";

describe("AuthService", () => {
  let service: AuthService;

  const usersRepositoryMock = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const userSessionsRepositoryMock = {
    create: jest.fn(),
    findActiveById: jest.fn(),
    rotate: jest.fn(),
    revoke: jest.fn(),
  };

  const onboardingRepositoryMock = {
    create: jest.fn(),
  };

  const configServiceMock = {
    getOrThrow: jest.fn(),
  };

  const user: UserRecord = {
    id: "c8fdcddd-9d7f-4ebf-b11e-a02821e2ca04",
    email: "user@example.com",
    password_hash: "hashed-password",
    email_verified_at: null,
    preferred_locale: "es",
    is_superadmin: false,
    status: "ACTIVE",
    created_at: new Date("2026-08-21T10:00:00.000Z"),
    updated_at: new Date("2026-08-21T10:00:00.000Z"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: usersRepositoryMock,
        },
        {
          provide: UserSessionsRepository,
          useValue: userSessionsRepositoryMock,
        },
        {
          provide: OnboardingRepository,
          useValue: onboardingRepositoryMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.mocked(argon2.hash).mockReset();
    jest.mocked(argon2.verify).mockReset();
    usersRepositoryMock.findByEmail.mockReset();
    usersRepositoryMock.create.mockReset();
    jwtServiceMock.signAsync.mockReset();
    jwtServiceMock.verifyAsync.mockReset();
    userSessionsRepositoryMock.create.mockReset();
    userSessionsRepositoryMock.findActiveById.mockReset();
    userSessionsRepositoryMock.rotate.mockReset();
    userSessionsRepositoryMock.revoke.mockReset();
    onboardingRepositoryMock.create.mockReset();
    configServiceMock.getOrThrow.mockReset();
  });

  it("registers a normalized email without returning the password hash", async () => {
    jest.mocked(argon2.hash).mockResolvedValue("hashed-password");
    usersRepositoryMock.findByEmail.mockResolvedValue(null);
    usersRepositoryMock.create.mockResolvedValue(user);

    await expect(
      service.register({
        email: "  USER@EXAMPLE.COM  ",
        password: "a-secure-password",
      }),
    ).resolves.toEqual({
      id: user.id,
      email: user.email,
      emailVerified: false,
      createdAt: user.created_at,
    });

    expect(usersRepositoryMock.findByEmail).toHaveBeenCalledWith(
      "user@example.com",
    );
    expect(argon2.hash).toHaveBeenCalledWith("a-secure-password", {
      type: argon2.argon2id,
    });
    expect(usersRepositoryMock.create).toHaveBeenCalledWith(
      "user@example.com",
      "hashed-password",
    );
  });

  it("rejects an email that already exists before hashing a password", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue(user);

    await expect(
      service.register({
        email: "user@example.com",
        password: "a-secure-password",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(argon2.hash).not.toHaveBeenCalled();
    expect(usersRepositoryMock.create).not.toHaveBeenCalled();
  });

  it("maps a concurrent duplicate-email insert to a conflict", async () => {
    jest.mocked(argon2.hash).mockResolvedValue("hashed-password");
    usersRepositoryMock.findByEmail.mockResolvedValue(null);
    usersRepositoryMock.create.mockRejectedValue({ code: "23505" });

    await expect(
      service.register({
        email: "user@example.com",
        password: "a-secure-password",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("validates credentials for an active user", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue(user);
    jest.mocked(argon2.verify).mockResolvedValue(true);

    await expect(
      service.validateCredentials({
        email: "  USER@EXAMPLE.COM  ",
        password: "a-secure-password",
      } satisfies LoginDto),
    ).resolves.toBe(user);

    expect(usersRepositoryMock.findByEmail).toHaveBeenCalledWith(
      "user@example.com",
    );
    expect(argon2.verify).toHaveBeenCalledWith(
      user.password_hash,
      "a-secure-password",
    );
  });

  it("creates an owner and organization during onboarding", async () => {
    const onboarding = {
      user: {
        id: "user-id",
        email: "owner@example.com",
        email_verified_at: null,
        created_at: new Date("2026-08-21T10:00:00.000Z"),
      },
      organization: {
        id: "organization-id",
        name: "Example Company",
        slug: "example-company",
        timezone: "Atlantic/Canary",
        created_at: new Date("2026-08-21T10:00:00.000Z"),
      },
    };
    usersRepositoryMock.findByEmail.mockResolvedValue(null);
    jest.mocked(argon2.hash).mockResolvedValue("onboarding-password-hash");
    onboardingRepositoryMock.create.mockResolvedValue(onboarding);

    await expect(
      service.onboard({
        email: "  OWNER@EXAMPLE.COM  ",
        password: "a-secure-password",
        organizationName: " Example Company ",
        organizationSlug: "example-company",
        timezone: "Atlantic/Canary",
      }),
    ).resolves.toEqual({
      user: {
        id: onboarding.user.id,
        email: onboarding.user.email,
        emailVerified: false,
        createdAt: onboarding.user.created_at,
      },
      organization: {
        id: onboarding.organization.id,
        name: onboarding.organization.name,
        slug: onboarding.organization.slug,
        timezone: onboarding.organization.timezone,
        createdAt: onboarding.organization.created_at,
      },
      membership: { role: "OWNER" },
    });

    expect(onboardingRepositoryMock.create).toHaveBeenCalledWith({
      email: "owner@example.com",
      passwordHash: "onboarding-password-hash",
      organizationName: "Example Company",
      organizationSlug: "example-company",
      timezone: "Atlantic/Canary",
    });
  });

  it("rejects credentials when the user does not exist", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue(null);

    await expect(
      service.validateCredentials({
        email: "missing@example.com",
        password: "a-secure-password",
      } satisfies LoginDto),
    ).rejects.toMatchObject({ status: 401 });

    expect(argon2.verify).not.toHaveBeenCalled();
  });

  it("rejects credentials when the password is incorrect", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue(user);
    jest.mocked(argon2.verify).mockResolvedValue(false);

    await expect(
      service.validateCredentials({
        email: "user@example.com",
        password: "wrong-password",
      } satisfies LoginDto),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rejects credentials when the account is inactive", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue({
      ...user,
      status: "BLOCKED",
    });
    jest.mocked(argon2.verify).mockResolvedValue(true);

    await expect(
      service.validateCredentials({
        email: "user@example.com",
        password: "a-secure-password",
      } satisfies LoginDto),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("returns an access token after validating credentials", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue(user);
    jest.mocked(argon2.verify).mockResolvedValue(true);
    jest.mocked(argon2.hash).mockResolvedValue("refresh-token-hash");
    jwtServiceMock.signAsync
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");
    configServiceMock.getOrThrow.mockReturnValue("refresh-secret");
    userSessionsRepositoryMock.create.mockResolvedValue(undefined);

    await expect(
      service.login({
        email: "user@example.com",
        password: "a-secure-password",
      }),
    ).resolves.toEqual({
      accessToken: "access-token",
      tokenType: "Bearer",
      expiresIn: 900,
      refreshToken: "refresh-token",
    });

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({ sub: user.id });
    expect(userSessionsRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        refreshTokenHash: "refresh-token-hash",
      }),
    );
  });

  it("does not issue an access token when credentials are invalid", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: "missing@example.com",
        password: "a-secure-password",
      }),
    ).rejects.toMatchObject({ status: 401 });

    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it("rotates an active refresh token and returns a new access token", async () => {
    const session = {
      id: "session-id",
      user_id: user.id,
      refresh_token_hash: "current-refresh-token-hash",
      expires_at: new Date("2026-09-20T10:00:00.000Z"),
      user_status: "ACTIVE",
    };
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: user.id,
      sid: session.id,
      jti: "refresh-token-id",
    });
    userSessionsRepositoryMock.findActiveById.mockResolvedValue(session);
    jest.mocked(argon2.verify).mockResolvedValue(true);
    jwtServiceMock.signAsync
      .mockResolvedValueOnce("next-refresh-token")
      .mockResolvedValueOnce("next-access-token");
    jest.mocked(argon2.hash).mockResolvedValue("next-refresh-token-hash");
    userSessionsRepositoryMock.rotate.mockResolvedValue(true);
    configServiceMock.getOrThrow.mockReturnValue("refresh-secret");

    await expect(service.refresh("current-refresh-token")).resolves.toEqual({
      accessToken: "next-access-token",
      tokenType: "Bearer",
      expiresIn: 900,
      refreshToken: "next-refresh-token",
    });

    expect(userSessionsRepositoryMock.rotate).toHaveBeenCalledWith({
      id: session.id,
      userId: user.id,
      refreshTokenHash: "next-refresh-token-hash",
    });
  });

  it("rejects a missing refresh token", async () => {
    await expect(service.refresh(undefined)).rejects.toMatchObject({
      status: 401,
    });

    expect(jwtServiceMock.verifyAsync).not.toHaveBeenCalled();
  });

  it("revokes the session associated with a valid refresh token on logout", async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: user.id,
      sid: "session-id",
      jti: "refresh-token-id",
    });
    configServiceMock.getOrThrow.mockReturnValue("refresh-secret");
    userSessionsRepositoryMock.revoke.mockResolvedValue(undefined);

    await expect(service.logout("current-refresh-token")).resolves.toBe(
      undefined,
    );

    expect(userSessionsRepositoryMock.revoke).toHaveBeenCalledWith(
      "session-id",
      user.id,
    );
  });

  it("does not fail logout when the refresh token is missing or invalid", async () => {
    jwtServiceMock.verifyAsync.mockRejectedValue(new Error("invalid token"));
    configServiceMock.getOrThrow.mockReturnValue("refresh-secret");

    await expect(service.logout(undefined)).resolves.toBeUndefined();
    await expect(
      service.logout("invalid-refresh-token"),
    ).resolves.toBeUndefined();

    expect(userSessionsRepositoryMock.revoke).not.toHaveBeenCalled();
  });
});
