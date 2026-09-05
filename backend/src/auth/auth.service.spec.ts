import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

jest.mock("argon2", () => ({
  argon2id: 2,
  hash: jest.fn(),
  verify: jest.fn(),
}));
jest.mock("otplib", () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}));

import * as argon2 from "argon2";
import { generateSecret, generateURI } from "otplib";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { OnboardingRepository } from "./onboarding.repository";
import { EmailProvider } from "./email.provider";
import { EmployeeRegistrationRepository } from "./employee-registration.repository";
import { UserSessionsRepository } from "./user-sessions.repository";
import { UserTokensRepository } from "./user-tokens.repository";
import { TwoFactorRepository } from "./two-factor.repository";
import { LoginProtectionRepository } from "./login-protection.repository";
import { UserRecord, UsersRepository } from "./users.repository";

describe("AuthService", () => {
  let service: AuthService;

  const usersRepositoryMock = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findActiveOrganizationsByUserId: jest.fn(),
    findAccessibleBusinessesByUserId: jest.fn(),
    create: jest.fn(),
    updateMyProfile: jest.fn(),
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

  const employeeRegistrationRepositoryMock = {
    canManageEmployees: jest.fn(),
    create: jest.fn(),
    createWithEmployee: jest.fn(),
    inviteExistingEmployee: jest.fn(),
  };

  const userTokensRepositoryMock = {
    replaceEmailVerificationToken: jest.fn(),
    consumeEmailVerificationToken: jest.fn(),
    verifyInitialEmail: jest.fn(),
    completeInitialPassword: jest.fn(),
    replacePasswordResetToken: jest.fn(),
    consumePasswordResetToken: jest.fn(),
    isPasswordResetTokenValid: jest.fn(),
  };

  const emailProviderMock = {
    sendEmailVerification: jest.fn(),
    sendAccountCredentials: jest.fn(),
    sendPasswordReset: jest.fn(),
  };

  const twoFactorRepositoryMock = {
    findState: jest.fn(),
    replacePendingSecret: jest.fn(),
    enable: jest.fn(),
  };

  const loginProtectionRepositoryMock = {
    isUserLocked: jest.fn(),
    recordUserFailure: jest.fn(),
    clearUserFailures: jest.fn(),
  };

  const configServiceMock = {
    getOrThrow: jest.fn(),
  };

  const user: UserRecord = {
    id: "c8fdcddd-9d7f-4ebf-b11e-a02821e2ca04",
    email: "user@example.com",
    phone: null,
    first_name: "Ada",
    last_name: "Lovelace",
    password_hash: "hashed-password",
    password_change_required: false,
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
          provide: EmployeeRegistrationRepository,
          useValue: employeeRegistrationRepositoryMock,
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
          provide: UserTokensRepository,
          useValue: userTokensRepositoryMock,
        },
        {
          provide: TwoFactorRepository,
          useValue: twoFactorRepositoryMock,
        },
        {
          provide: LoginProtectionRepository,
          useValue: loginProtectionRepositoryMock,
        },
        {
          provide: EmailProvider,
          useValue: emailProviderMock,
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
    usersRepositoryMock.findById.mockReset();
    usersRepositoryMock.findActiveOrganizationsByUserId.mockReset();
    usersRepositoryMock.findAccessibleBusinessesByUserId.mockReset();
    usersRepositoryMock.create.mockReset();
    usersRepositoryMock.updateMyProfile.mockReset();
    employeeRegistrationRepositoryMock.canManageEmployees.mockReset();
    employeeRegistrationRepositoryMock.create.mockReset();
    employeeRegistrationRepositoryMock.createWithEmployee.mockReset();
    employeeRegistrationRepositoryMock.inviteExistingEmployee.mockReset();
    jwtServiceMock.signAsync.mockReset();
    jwtServiceMock.verifyAsync.mockReset();
    userSessionsRepositoryMock.create.mockReset();
    userSessionsRepositoryMock.findActiveById.mockReset();
    userSessionsRepositoryMock.rotate.mockReset();
    userSessionsRepositoryMock.revoke.mockReset();
    onboardingRepositoryMock.create.mockReset();
    userTokensRepositoryMock.replaceEmailVerificationToken.mockReset();
    userTokensRepositoryMock.consumeEmailVerificationToken.mockReset();
    userTokensRepositoryMock.verifyInitialEmail.mockReset();
    userTokensRepositoryMock.completeInitialPassword.mockReset();
    userTokensRepositoryMock.replacePasswordResetToken.mockReset();
    userTokensRepositoryMock.consumePasswordResetToken.mockReset();
    userTokensRepositoryMock.isPasswordResetTokenValid.mockReset();
    emailProviderMock.sendEmailVerification.mockReset();
    emailProviderMock.sendAccountCredentials.mockReset();
    emailProviderMock.sendPasswordReset.mockReset();
    twoFactorRepositoryMock.findState.mockReset();
    twoFactorRepositoryMock.replacePendingSecret.mockReset();
    twoFactorRepositoryMock.enable.mockReset();
    loginProtectionRepositoryMock.isUserLocked.mockReset();
    loginProtectionRepositoryMock.recordUserFailure.mockReset();
    loginProtectionRepositoryMock.clearUserFailures.mockReset();
    configServiceMock.getOrThrow.mockReset();
  });

  it("registers a normalized email without returning the password hash", async () => {
    jest.mocked(argon2.hash).mockResolvedValue("hashed-password");
    usersRepositoryMock.findByEmail.mockResolvedValue(null);
    employeeRegistrationRepositoryMock.canManageEmployees.mockResolvedValue(
      true,
    );
    employeeRegistrationRepositoryMock.create.mockResolvedValue(user);

    await expect(
      service.register(
        {
          email: "  USER@EXAMPLE.COM  ",
          organizationId: "11111111-1111-4111-8111-111111111111",
          businessIds: ["22222222-2222-4222-8222-222222222222"],
        },
        "actor-id",
      ),
    ).resolves.toEqual({
      id: user.id,
      email: user.email,
      emailVerified: false,
      createdAt: user.created_at,
    });

    expect(usersRepositoryMock.findByEmail).toHaveBeenCalledWith(
      "user@example.com",
    );
    expect(argon2.hash).toHaveBeenCalledWith(
      expect.stringMatching(/^[A-Za-z0-9_-]{8}$/),
      { type: argon2.argon2id },
    );
    expect(employeeRegistrationRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        passwordHash: "hashed-password",
      }),
    );
    expect(emailProviderMock.sendAccountCredentials).toHaveBeenCalledTimes(1);
  });

  it("updates only the authenticated user's permitted profile fields", async () => {
    const activeUser = {
      ...user,
      email_verified_at: new Date("2026-08-24T10:00:00.000Z"),
    };
    usersRepositoryMock.findById
      .mockResolvedValueOnce(activeUser)
      .mockResolvedValueOnce({
        ...activeUser,
        first_name: "Grace",
        phone: "600000001",
      });
    usersRepositoryMock.updateMyProfile.mockResolvedValue({
      ...activeUser,
      first_name: "Grace",
      phone: "600000001",
    });
    usersRepositoryMock.findActiveOrganizationsByUserId.mockResolvedValue([]);
    usersRepositoryMock.findAccessibleBusinessesByUserId.mockResolvedValue([]);

    await expect(
      service.updateMyProfile(user.id, {
        firstName: " Grace ",
        phone: " 600000001 ",
        preferredLocale: "EN",
      }),
    ).resolves.toMatchObject({ firstName: "Grace", phone: "600000001" });

    expect(usersRepositoryMock.updateMyProfile).toHaveBeenCalledWith(user.id, {
      firstName: "Grace",
      lastName: undefined,
      phone: "600000001",
      preferredLocale: "en",
    });
  });

  it("rejects an email that already exists before hashing a password", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue(user);
    employeeRegistrationRepositoryMock.canManageEmployees.mockResolvedValue(
      true,
    );

    await expect(
      service.register(
        {
          email: "user@example.com",
          organizationId: "11111111-1111-4111-8111-111111111111",
          businessIds: ["22222222-2222-4222-8222-222222222222"],
        },
        "actor-id",
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(argon2.hash).not.toHaveBeenCalled();
    expect(usersRepositoryMock.create).not.toHaveBeenCalled();
  });

  it("creates and emails an employee invitation with a temporary password", async () => {
    jest.mocked(argon2.hash).mockResolvedValue("hashed-password");
    usersRepositoryMock.findByEmail.mockResolvedValue(null);
    employeeRegistrationRepositoryMock.createWithEmployee.mockResolvedValue({
      user,
      employee: { id: "employee-id", user_id: user.id },
    });

    await expect(
      service.inviteEmployee({
        email: " EMPLOYEE@EXAMPLE.COM ",
        organizationId: "organization-id",
        businessId: "business-id",
        firstName: "Ada",
        lastName: "Lovelace",
      }),
    ).resolves.toEqual({ id: "employee-id", user_id: user.id });

    expect(
      employeeRegistrationRepositoryMock.createWithEmployee,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "employee@example.com",
        organizationId: "organization-id",
        businessIds: ["business-id"],
      }),
    );
    expect(emailProviderMock.sendAccountCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ email: "employee@example.com" }),
    );
  });

  it("invites an existing employee and emails the temporary password", async () => {
    jest.mocked(argon2.hash).mockResolvedValue("hashed-password");
    usersRepositoryMock.findByEmail.mockResolvedValue(null);
    employeeRegistrationRepositoryMock.inviteExistingEmployee.mockResolvedValue(
      {
        id: "employee-id",
        user_id: user.id,
      },
    );

    await expect(
      service.inviteExistingEmployee({
        email: " EMPLOYEE@EXAMPLE.COM ",
        organizationId: "organization-id",
        businessId: "business-id",
        employeeId: "employee-id",
        firstName: "Ada",
        lastName: "Lovelace",
      }),
    ).resolves.toEqual({ id: "employee-id", user_id: user.id });

    expect(
      employeeRegistrationRepositoryMock.inviteExistingEmployee,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "employee@example.com",
        organizationId: "organization-id",
        businessId: "business-id",
        employeeId: "employee-id",
      }),
    );
    expect(emailProviderMock.sendAccountCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ email: "employee@example.com" }),
    );
  });

  it("maps a concurrent duplicate-email insert to a conflict", async () => {
    jest.mocked(argon2.hash).mockResolvedValue("hashed-password");
    usersRepositoryMock.findByEmail.mockResolvedValue(null);
    employeeRegistrationRepositoryMock.canManageEmployees.mockResolvedValue(
      true,
    );
    employeeRegistrationRepositoryMock.create.mockRejectedValue({
      code: "23505",
    });

    await expect(
      service.register(
        {
          email: "user@example.com",
          organizationId: "11111111-1111-4111-8111-111111111111",
          businessIds: ["22222222-2222-4222-8222-222222222222"],
        },
        "actor-id",
      ),
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
      business: {
        id: "business-id",
        name: "Example Company",
        slug: "example-company",
        timezone: "Atlantic/Canary",
        created_at: new Date("2026-08-21T10:00:00.000Z"),
      },
    };
    usersRepositoryMock.findByEmail.mockResolvedValue(null);
    jest.mocked(argon2.hash).mockResolvedValue("onboarding-password-hash");
    onboardingRepositoryMock.create.mockResolvedValue(onboarding);
    configServiceMock.getOrThrow.mockReturnValue(
      "onboarding-secret-with-at-least-32-characters",
    );

    await expect(
      service.onboard(
        {
          email: "  OWNER@EXAMPLE.COM  ",
          firstName: " Ada ",
          lastName: " Lovelace ",
          organizationName: " Example Company ",
          organizationSlug: "example-company",
          timezone: "Atlantic/Canary",
        },
        "onboarding-secret-with-at-least-32-characters",
      ),
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
      business: {
        id: onboarding.business.id,
        name: onboarding.business.name,
        slug: onboarding.business.slug,
        timezone: onboarding.business.timezone,
        createdAt: onboarding.business.created_at,
      },
      membership: { role: "OWNER" },
    });

    expect(onboardingRepositoryMock.create).toHaveBeenCalledWith({
      email: "owner@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      passwordHash: "onboarding-password-hash",
      organizationName: "Example Company",
      organizationSlug: "example-company",
      timezone: "Atlantic/Canary",
    });
    expect(emailProviderMock.sendAccountCredentials).toHaveBeenCalledTimes(1);
  });

  it("rejects initial onboarding without the configured secret", async () => {
    configServiceMock.getOrThrow.mockReturnValue(
      "onboarding-secret-with-at-least-32-characters",
    );

    await expect(
      service.onboard(
        {
          email: "any-email@example.com",
          firstName: "Ada",
          lastName: "Lovelace",
          organizationName: "Example Company",
          organizationSlug: "example-company",
        },
        "wrong-secret",
      ),
    ).rejects.toMatchObject({ status: 403 });

    expect(usersRepositoryMock.findByEmail).not.toHaveBeenCalled();
    expect(onboardingRepositoryMock.create).not.toHaveBeenCalled();
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

    expect(
      loginProtectionRepositoryMock.recordUserFailure,
    ).toHaveBeenCalledWith(user.id);
  });

  it("rejects a temporarily locked account without checking its password", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue(user);
    loginProtectionRepositoryMock.isUserLocked.mockResolvedValue(true);

    await expect(
      service.validateCredentials({
        email: user.email,
        password: "a-secure-password",
      } satisfies LoginDto),
    ).rejects.toMatchObject({ status: 401 });

    expect(argon2.verify).not.toHaveBeenCalled();
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
    usersRepositoryMock.findByEmail.mockResolvedValue({
      ...user,
      email_verified_at: new Date("2026-08-24T10:00:00.000Z"),
    });
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
    expect(
      loginProtectionRepositoryMock.clearUserFailures,
    ).toHaveBeenCalledWith(user.id);
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

  it("pauses login until an enabled second factor is verified", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue({
      ...user,
      email_verified_at: new Date("2026-08-24T10:00:00.000Z"),
    });
    jest.mocked(argon2.verify).mockResolvedValue(true);
    twoFactorRepositoryMock.findState.mockResolvedValue({
      secret_encrypted: "encrypted-secret",
      enabled: true,
    });
    jwtServiceMock.signAsync.mockResolvedValue("two-factor-attempt-token");
    configServiceMock.getOrThrow.mockReturnValue("verification-secret");

    await expect(
      service.login({ email: user.email, password: "a-secure-password" }),
    ).resolves.toEqual({
      twoFactorRequired: true,
      twoFactorAttemptToken: "two-factor-attempt-token",
    });

    expect(userSessionsRepositoryMock.create).not.toHaveBeenCalled();
  });

  it("creates an encrypted pending TOTP secret for an authenticated user", async () => {
    twoFactorRepositoryMock.findState.mockResolvedValue({
      secret_encrypted: null,
      enabled: false,
    });
    jest
      .mocked(generateSecret)
      .mockReturnValue("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
    jest.mocked(generateURI).mockReturnValue("otpauth://totp/BUKIOO:user");
    configServiceMock.getOrThrow.mockReturnValue(
      "totp-encryption-key-with-at-least-32-characters",
    );

    await expect(service.createTwoFactorSetup(user.id)).resolves.toEqual({
      secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      otpauthUri: "otpauth://totp/BUKIOO:user",
    });

    expect(twoFactorRepositoryMock.replacePendingSecret).toHaveBeenCalledWith(
      user.id,
      expect.any(String),
    );
  });

  it("sends email verification and pauses login for a temporary password", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue({
      ...user,
      password_change_required: true,
    });
    jest.mocked(argon2.verify).mockResolvedValue(true);
    userTokensRepositoryMock.replaceEmailVerificationToken.mockResolvedValue(
      undefined,
    );
    emailProviderMock.sendEmailVerification.mockResolvedValue(undefined);
    jwtServiceMock.signAsync.mockResolvedValue("verification-attempt-token");
    configServiceMock.getOrThrow.mockReturnValue("verification-secret");

    await expect(
      service.login({
        email: user.email,
        password: "a-secure-password",
      }),
    ).resolves.toEqual({
      emailVerificationRequired: true,
      verificationAttemptToken: "verification-attempt-token",
    });

    expect(
      userTokensRepositoryMock.replaceEmailVerificationToken,
    ).toHaveBeenCalledTimes(1);
    expect(emailProviderMock.sendEmailVerification).toHaveBeenCalledTimes(1);
    expect(jwtServiceMock.signAsync).toHaveBeenCalledTimes(1);
    expect(userSessionsRepositoryMock.create).not.toHaveBeenCalled();
  });

  it("resumes password activation without resending email after initial verification", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue({
      ...user,
      password_change_required: true,
      email_verified_at: new Date("2026-09-03T10:00:00.000Z"),
    });
    jest.mocked(argon2.verify).mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue("password-activation-token");
    configServiceMock.getOrThrow.mockReturnValue("verification-secret");

    await expect(
      service.login({
        email: user.email,
        password: "a-secure-password",
      }),
    ).resolves.toEqual({
      passwordChangeRequired: true,
      passwordActivationAttemptToken: "password-activation-token",
    });

    expect(
      userTokensRepositoryMock.replaceEmailVerificationToken,
    ).not.toHaveBeenCalled();
    expect(emailProviderMock.sendEmailVerification).not.toHaveBeenCalled();
    expect(userSessionsRepositoryMock.create).not.toHaveBeenCalled();
  });

  it("verifies an initial email and creates a password-activation attempt", async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: user.id,
      purpose: "EMAIL_VERIFICATION_ATTEMPT",
      jti: "attempt-id",
    });
    userTokensRepositoryMock.verifyInitialEmail.mockResolvedValue(true);
    jwtServiceMock.signAsync.mockResolvedValue("password-activation-token");
    configServiceMock.getOrThrow.mockReturnValue("verification-secret");

    await expect(
      service.verifyInitialEmail(
        { token: "verification-token" },
        "verification-attempt-token",
      ),
    ).resolves.toBe("password-activation-token");

    expect(userTokensRepositoryMock.verifyInitialEmail).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id }),
    );
  });

  it("sets the initial password and creates a session", async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: user.id,
      purpose: "PASSWORD_ACTIVATION_ATTEMPT",
      jti: "attempt-id",
    });
    jest
      .mocked(argon2.hash)
      .mockResolvedValueOnce("new-password-hash")
      .mockResolvedValueOnce("refresh-token-hash");
    userTokensRepositoryMock.completeInitialPassword.mockResolvedValue(true);
    usersRepositoryMock.findById.mockResolvedValue({
      ...user,
      email_verified_at: new Date("2026-08-24T10:00:00.000Z"),
      password_change_required: false,
    });
    jwtServiceMock.signAsync
      .mockResolvedValueOnce("access-token")
      .mockResolvedValueOnce("refresh-token");
    userSessionsRepositoryMock.create.mockResolvedValue(undefined);
    configServiceMock.getOrThrow.mockReturnValue("verification-secret");

    await expect(
      service.setInitialPassword(
        { password: "new-secure-password" },
        "password-activation-token",
      ),
    ).resolves.toEqual({
      accessToken: "access-token",
      tokenType: "Bearer",
      expiresIn: 900,
      refreshToken: "refresh-token",
    });

    expect(
      userTokensRepositoryMock.completeInitialPassword,
    ).toHaveBeenCalledWith({
      userId: user.id,
      passwordHash: "new-password-hash",
    });
    expect(userSessionsRepositoryMock.create).toHaveBeenCalledTimes(1);
  });

  it("rotates an active refresh token and returns a new access token", async () => {
    const session = {
      id: "session-id",
      user_id: user.id,
      refresh_token_hash: "current-refresh-token-hash",
      expires_at: new Date("2026-09-20T10:00:00.000Z"),
      user_status: "ACTIVE",
      user_email_verified_at: new Date("2026-08-24T10:00:00.000Z"),
      user_password_change_required: false,
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

  it("rejects refresh for an unverified user session", async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: user.id,
      sid: "session-id",
      jti: "refresh-token-id",
    });
    userSessionsRepositoryMock.findActiveById.mockResolvedValue({
      id: "session-id",
      user_id: user.id,
      refresh_token_hash: "refresh-token-hash",
      expires_at: new Date("2026-09-20T10:00:00.000Z"),
      user_status: "ACTIVE",
      user_email_verified_at: null,
      user_password_change_required: false,
    });
    configServiceMock.getOrThrow.mockReturnValue("refresh-secret");

    await expect(
      service.refresh("current-refresh-token"),
    ).rejects.toMatchObject({ status: 401 });

    expect(argon2.verify).not.toHaveBeenCalled();
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

  it("returns a safe profile for an active user", async () => {
    usersRepositoryMock.findById.mockResolvedValue({
      ...user,
      email_verified_at: new Date("2026-08-24T10:00:00.000Z"),
    });
    usersRepositoryMock.findActiveOrganizationsByUserId.mockResolvedValue([
      {
        id: "organization-id",
        name: "Example Company",
        logo_url: "https://cdn.example.com/organization-logo.png",
        role: "OWNER",
      },
    ]);
    usersRepositoryMock.findAccessibleBusinessesByUserId.mockResolvedValue([
      {
        id: "business-id",
        organization_id: "organization-id",
        name: "Example Location",
        slug: "example-location",
        logo_url: "https://cdn.example.com/business-logo.png",
        status: "ACTIVE",
      },
    ]);

    await expect(service.me(user.id)).resolves.toEqual({
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      emailVerified: true,
      preferredLocale: user.preferred_locale,
      isSuperadmin: false,
      status: "ACTIVE",
      createdAt: user.created_at,
      organizations: [
        {
          id: "organization-id",
          name: "Example Company",
          logoUrl: "https://cdn.example.com/organization-logo.png",
          role: "OWNER",
          businesses: [
            {
              id: "business-id",
              name: "Example Location",
              slug: "example-location",
              logoUrl: "https://cdn.example.com/business-logo.png",
              status: "ACTIVE",
            },
          ],
        },
      ],
    });
  });

  it("rejects a missing or inactive user profile", async () => {
    usersRepositoryMock.findById.mockResolvedValueOnce(null);

    await expect(service.me("missing-user-id")).rejects.toMatchObject({
      status: 401,
    });

    usersRepositoryMock.findById.mockResolvedValueOnce({
      ...user,
      status: "BLOCKED",
    });

    await expect(service.me(user.id)).rejects.toMatchObject({ status: 401 });

    usersRepositoryMock.findById.mockResolvedValueOnce(user);

    await expect(service.me(user.id)).rejects.toMatchObject({ status: 401 });
  });

  it("creates and dispatches a hashed six-digit email-verification code", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue(user);
    userTokensRepositoryMock.replaceEmailVerificationToken.mockResolvedValue(
      undefined,
    );
    emailProviderMock.sendEmailVerification.mockResolvedValue(undefined);

    await expect(
      service.requestEmailVerification({ email: " USER@EXAMPLE.COM " }),
    ).resolves.toBeUndefined();

    expect(
      userTokensRepositoryMock.replaceEmailVerificationToken,
    ).toHaveBeenCalledTimes(1);
    expect(emailProviderMock.sendEmailVerification).toHaveBeenCalledTimes(1);
    expect(emailProviderMock.sendEmailVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        email: user.email,
      }),
    );
    expect(usersRepositoryMock.findByEmail).toHaveBeenCalledWith(
      "user@example.com",
    );
  });

  it("does not issue an email-verification code for unknown users", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue(null);

    await expect(
      service.requestEmailVerification({ email: "missing@example.com" }),
    ).resolves.toBeUndefined();

    expect(
      userTokensRepositoryMock.replaceEmailVerificationToken,
    ).not.toHaveBeenCalled();
    expect(emailProviderMock.sendEmailVerification).not.toHaveBeenCalled();
  });

  it("marks an email as verified when its code is valid", async () => {
    userTokensRepositoryMock.consumeEmailVerificationToken.mockResolvedValue(
      true,
    );

    await expect(service.verifyEmail({ token: "123456" })).resolves.toEqual({
      emailVerified: true,
    });

    expect(
      userTokensRepositoryMock.consumeEmailVerificationToken,
    ).toHaveBeenCalledTimes(1);
  });

  it("rejects a reused, expired, or unknown email-verification code", async () => {
    userTokensRepositoryMock.consumeEmailVerificationToken.mockResolvedValue(
      false,
    );

    await expect(
      service.verifyEmail({ token: "000000" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("sends a hashed six-digit password-reset code for an active user", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue(user);
    usersRepositoryMock.findById.mockResolvedValue(user);
    userTokensRepositoryMock.replacePasswordResetToken.mockResolvedValue(
      undefined,
    );
    emailProviderMock.sendPasswordReset.mockResolvedValue(undefined);

    await expect(
      service.requestPasswordReset({ email: " USER@EXAMPLE.COM " }),
    ).resolves.toBeUndefined();

    expect(
      userTokensRepositoryMock.replacePasswordResetToken,
    ).toHaveBeenCalledTimes(1);
    expect(emailProviderMock.sendPasswordReset).toHaveBeenCalledTimes(1);
  });

  it("replaces the pending password-reset code for an active user ID", async () => {
    usersRepositoryMock.findById.mockResolvedValue(user);
    userTokensRepositoryMock.replacePasswordResetToken.mockResolvedValue(
      undefined,
    );
    emailProviderMock.sendPasswordReset.mockResolvedValue(undefined);

    await expect(
      service.requestPasswordResetForUser(user.id),
    ).resolves.toBeUndefined();

    expect(
      userTokensRepositoryMock.replacePasswordResetToken,
    ).toHaveBeenCalledWith(expect.objectContaining({ userId: user.id }));
    expect(emailProviderMock.sendPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ email: user.email }),
    );
  });

  it("does not disclose whether a password-reset email exists", async () => {
    usersRepositoryMock.findByEmail.mockResolvedValue(null);

    await expect(
      service.requestPasswordReset({ email: "missing@example.com" }),
    ).resolves.toBeUndefined();

    expect(
      userTokensRepositoryMock.replacePasswordResetToken,
    ).not.toHaveBeenCalled();
    expect(emailProviderMock.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("resets the password when a valid code is consumed", async () => {
    jest.mocked(argon2.hash).mockResolvedValue("new-password-hash");
    userTokensRepositoryMock.consumePasswordResetToken.mockResolvedValue(true);

    await expect(
      service.resetPassword({
        token: "123456",
        password: "new-secure-password",
      }),
    ).resolves.toBeUndefined();

    expect(
      userTokensRepositoryMock.consumePasswordResetToken,
    ).toHaveBeenCalledTimes(1);
  });

  it("rejects a reused, expired, or unknown password-reset code", async () => {
    jest.mocked(argon2.hash).mockResolvedValue("new-password-hash");
    userTokensRepositoryMock.consumePasswordResetToken.mockResolvedValue(false);

    await expect(
      service.resetPassword({
        token: "000000",
        password: "new-secure-password",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("verifies a valid password-reset code without consuming it", async () => {
    userTokensRepositoryMock.isPasswordResetTokenValid.mockResolvedValue(true);

    await expect(
      service.verifyPasswordResetCode({ token: "123456" }),
    ).resolves.toBeUndefined();

    expect(
      userTokensRepositoryMock.isPasswordResetTokenValid,
    ).toHaveBeenCalledTimes(1);
    expect(
      userTokensRepositoryMock.consumePasswordResetToken,
    ).not.toHaveBeenCalled();
  });

  it("rejects an invalid password-reset code before changing the password", async () => {
    userTokensRepositoryMock.isPasswordResetTokenValid.mockResolvedValue(false);

    await expect(
      service.verifyPasswordResetCode({ token: "000000" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
