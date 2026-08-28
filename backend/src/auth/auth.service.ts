import {
  ConflictException,
  Injectable,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "crypto";
import { generateSecret, generateURI, verify } from "otplib";
import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  EMAIL_VERIFICATION_ATTEMPT_EXPIRES_IN_SECONDS,
  REFRESH_TOKEN_EXPIRES_IN_SECONDS,
  TWO_FACTOR_ATTEMPT_EXPIRES_IN_SECONDS,
} from "./auth.constants";
import { LoginDto } from "./dto/login.dto";
import { OnboardDto } from "./dto/onboard.dto";
import { RegisterDto } from "./dto/register.dto";
import { RequestEmailVerificationDto } from "./dto/request-email-verification.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { SetInitialPasswordDto } from "./dto/set-initial-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyTwoFactorDto } from "./dto/verify-two-factor.dto";
import { UseRecoveryCodeDto } from "./dto/use-recovery-code.dto";
import { EmailProvider } from "./email.provider";
import { EmployeeRegistrationRepository } from "./employee-registration.repository";
import { OnboardingRepository } from "./onboarding.repository";
import { UserSessionsRepository } from "./user-sessions.repository";
import { UserTokensRepository } from "./user-tokens.repository";
import { TwoFactorRepository } from "./two-factor.repository";
import { UserRecord, UsersRepository } from "./users.repository";

export interface LoginSessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

interface RefreshTokenPayload {
  sub: string;
  sid: string;
  jti: string;
}

interface EmailVerificationAttemptPayload {
  sub: string;
  purpose: "EMAIL_VERIFICATION_ATTEMPT";
  jti: string;
}

interface PasswordActivationAttemptPayload {
  sub: string;
  purpose: "PASSWORD_ACTIVATION_ATTEMPT";
  jti: string;
}

interface TwoFactorAttemptPayload {
  sub: string;
  purpose: "TWO_FACTOR_ATTEMPT";
  jti: string;
}

export interface InviteEmployeeInput {
  email: string;
  organizationId: string;
  businessId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  color?: string;
  notes?: string;
}

export interface InviteExistingEmployeeInput {
  email: string;
  organizationId: string;
  businessId: string;
  employeeId: string;
}

const EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_SECONDS = 10 * 60;
const PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS = 10 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly employeeRegistrationRepository: EmployeeRegistrationRepository,
    private readonly userSessionsRepository: UserSessionsRepository,
    private readonly onboardingRepository: OnboardingRepository,
    private readonly userTokensRepository: UserTokensRepository,
    private readonly twoFactorRepository: TwoFactorRepository,
    private readonly emailProvider: EmailProvider,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto, actorUserId: string) {
    const email = registerDto.email.trim().toLowerCase();
    const businessIds = [...new Set(registerDto.businessIds)];

    const canManageEmployees =
      await this.employeeRegistrationRepository.canManageEmployees(
        actorUserId,
        registerDto.organizationId,
        businessIds,
      );

    if (!canManageEmployees) {
      throw new ForbiddenException(
        "No tienes permiso para gestionar empleados de esos negocios",
      );
    }

    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException("Ya existe una cuenta con este email");
    }

    const temporaryPassword = this.createTemporaryPassword();
    const passwordHash = await argon2.hash(temporaryPassword, {
      type: argon2.argon2id,
    });

    let user: UserRecord;

    try {
      user = await this.employeeRegistrationRepository.create({
        email,
        passwordHash,
        organizationId: registerDto.organizationId,
        businessIds,
        role: registerDto.role ?? "EMPLOYEE",
      });
    } catch (error: unknown) {
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException("Ya existe una cuenta con este email");
      }

      throw error;
    }

    await this.emailProvider.sendAccountCredentials({
      email: user.email,
      temporaryPassword,
    });

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified_at !== null,
      createdAt: user.created_at,
    };
  }

  async inviteEmployee(input: InviteEmployeeInput) {
    const email = input.email.trim().toLowerCase();
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException("Ya existe una cuenta con este email");
    }

    const temporaryPassword = this.createTemporaryPassword();
    const passwordHash = await argon2.hash(temporaryPassword, {
      type: argon2.argon2id,
    });

    try {
      const invitation =
        await this.employeeRegistrationRepository.createWithEmployee({
          email,
          passwordHash,
          organizationId: input.organizationId,
          businessIds: [input.businessId],
          role: "EMPLOYEE",
          employee: {
            businessId: input.businessId,
            firstName: input.firstName,
            lastName: input.lastName,
            email,
            phone: input.phone,
            color: input.color,
            notes: input.notes,
          },
        });

      await this.emailProvider.sendAccountCredentials({
        email,
        temporaryPassword,
      });

      return invitation.employee;
    } catch (error: unknown) {
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException("Ya existe una cuenta con este email");
      }

      throw error;
    }
  }

  async inviteExistingEmployee(input: InviteExistingEmployeeInput) {
    const email = input.email.trim().toLowerCase();
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException("Ya existe una cuenta con este email");
    }

    const temporaryPassword = this.createTemporaryPassword();
    const passwordHash = await argon2.hash(temporaryPassword, {
      type: argon2.argon2id,
    });

    try {
      const employee =
        await this.employeeRegistrationRepository.inviteExistingEmployee({
          email,
          passwordHash,
          organizationId: input.organizationId,
          businessId: input.businessId,
          employeeId: input.employeeId,
        });

      await this.emailProvider.sendAccountCredentials({
        email,
        temporaryPassword,
      });

      return employee;
    } catch (error: unknown) {
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException("Ya existe una cuenta con este email");
      }

      throw error;
    }
  }

  async validateCredentials(loginDto: LoginDto): Promise<UserRecord> {
    const email = loginDto.email.trim().toLowerCase();
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException("Email o contraseña incorrectos");
    }

    const passwordMatches = await argon2.verify(
      user.password_hash,
      loginDto.password,
    );

    if (!passwordMatches || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Email o contraseña incorrectos");
    }

    return user;
  }

  async onboard(onboardDto: OnboardDto, onboardingSecret: string | undefined) {
    const email = onboardDto.email.trim().toLowerCase();
    this.assertInitialOnboardingCredentials(onboardingSecret);
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException("Ya existe una cuenta con este email");
    }

    const temporaryPassword = this.createTemporaryPassword();
    const passwordHash = await argon2.hash(temporaryPassword, {
      type: argon2.argon2id,
    });

    try {
      const onboarding = await this.onboardingRepository.create({
        email,
        passwordHash,
        organizationName: onboardDto.organizationName.trim(),
        organizationSlug: onboardDto.organizationSlug.trim().toLowerCase(),
        timezone: onboardDto.timezone ?? "UTC",
      });

      await this.emailProvider.sendAccountCredentials({
        email: onboarding.user.email,
        temporaryPassword,
      });

      return {
        user: {
          id: onboarding.user.id,
          email: onboarding.user.email,
          emailVerified: onboarding.user.email_verified_at !== null,
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
        membership: {
          role: "OWNER",
        },
      };
    } catch (error: unknown) {
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException(
          "Ya existe una cuenta o empresa con esos datos",
        );
      }

      throw error;
    }
  }

  async login(loginDto: LoginDto, sessionMetadata: LoginSessionMetadata = {}) {
    const user = await this.validateCredentials(loginDto);

    if (user.password_change_required) {
      await this.requestEmailVerification({ email: user.email });
      return {
        emailVerificationRequired: true,
        verificationAttemptToken:
          await this.createEmailVerificationAttemptToken(user.id),
      };
    }

    if (user.email_verified_at === null) {
      await this.requestEmailVerification({ email: user.email });
      throw new ForbiddenException("Debes verificar tu email antes de acceder");
    }

    const twoFactorState = await this.twoFactorRepository.findState(user.id);

    if (twoFactorState?.enabled) {
      return {
        twoFactorRequired: true,
        twoFactorAttemptToken: await this.createTwoFactorAttemptToken(user.id),
      };
    }

    return this.createSession(user, sessionMetadata);
  }

  async createTwoFactorSetup(userId: string) {
    const state = await this.twoFactorRepository.findState(userId);

    if (!state || state.enabled) {
      throw new BadRequestException(
        "No se puede iniciar la configuracion de 2FA",
      );
    }

    const secret = generateSecret();
    await this.twoFactorRepository.replacePendingSecret(
      userId,
      this.encryptTwoFactorSecret(secret),
    );

    return {
      secret,
      otpauthUri: generateURI({
        issuer: "BUKIOO",
        label: userId,
        secret,
      }),
    };
  }

  async enableTwoFactor(
    userId: string,
    verifyTwoFactorDto: VerifyTwoFactorDto,
  ) {
    const recoveryCodes = await this.enableTwoFactorForUser(
      userId,
      verifyTwoFactorDto.code,
    );

    return { recoveryCodes };
  }

  async verifyTwoFactor(
    verifyTwoFactorDto: VerifyTwoFactorDto,
    twoFactorAttemptToken: string | undefined,
    sessionMetadata: LoginSessionMetadata = {},
  ) {
    const userId = await this.verifyTwoFactorAttemptToken(
      twoFactorAttemptToken,
    );
    const state = await this.twoFactorRepository.findState(userId);

    if (!state?.enabled || !state.secret_encrypted) {
      throw new UnauthorizedException("Segundo factor invalido");
    }

    const verification = await verify({
      secret: this.decryptTwoFactorSecret(state.secret_encrypted),
      token: verifyTwoFactorDto.code,
    });

    if (!verification.valid) {
      throw new UnauthorizedException("Segundo factor invalido");
    }

    const user = await this.usersRepository.findById(userId);

    if (!user || user.status !== "ACTIVE" || user.email_verified_at === null) {
      throw new UnauthorizedException("No se pudo completar la autenticacion");
    }

    return this.createSession(user, sessionMetadata);
  }

  async useRecoveryCode(
    useRecoveryCodeDto: UseRecoveryCodeDto,
    twoFactorAttemptToken: string | undefined,
    sessionMetadata: LoginSessionMetadata = {},
  ) {
    const userId = await this.verifyTwoFactorAttemptToken(
      twoFactorAttemptToken,
    );
    const state = await this.twoFactorRepository.findState(userId);

    if (!state?.enabled) {
      throw new UnauthorizedException("Codigo de recuperacion invalido");
    }

    const recoveryCodes =
      await this.twoFactorRepository.findUnusedRecoveryCodes(userId);
    const normalizedCode = useRecoveryCodeDto.code.toUpperCase();

    for (const recoveryCode of recoveryCodes) {
      if (await argon2.verify(recoveryCode.code_hash, normalizedCode)) {
        const consumed = await this.twoFactorRepository.consumeRecoveryCode(
          recoveryCode.id,
          userId,
        );

        if (!consumed) {
          break;
        }

        const user = await this.usersRepository.findById(userId);

        if (
          !user ||
          user.status !== "ACTIVE" ||
          user.email_verified_at === null
        ) {
          throw new UnauthorizedException(
            "No se pudo completar la autenticacion",
          );
        }

        return this.createSession(user, sessionMetadata);
      }
    }

    throw new UnauthorizedException("Codigo de recuperacion invalido");
  }

  async verifyInitialEmail(
    verifyEmailDto: VerifyEmailDto,
    verificationAttemptToken: string | undefined,
  ): Promise<string> {
    const userId = await this.verifyEmailVerificationAttemptToken(
      verificationAttemptToken,
    );
    const verified = await this.userTokensRepository.verifyInitialEmail({
      userId,
      tokenHash: this.hashToken(verifyEmailDto.token),
    });

    if (!verified) {
      throw new BadRequestException(
        "Token de verificacion invalido o caducado",
      );
    }

    return this.createPasswordActivationAttemptToken(userId);
  }

  async setInitialPassword(
    setInitialPasswordDto: SetInitialPasswordDto,
    passwordActivationAttemptToken: string | undefined,
    sessionMetadata: LoginSessionMetadata = {},
  ) {
    const userId = await this.verifyPasswordActivationAttemptToken(
      passwordActivationAttemptToken,
    );
    const passwordHash = await argon2.hash(setInitialPasswordDto.password, {
      type: argon2.argon2id,
    });
    const completed = await this.userTokensRepository.completeInitialPassword({
      userId,
      passwordHash,
    });

    if (!completed) {
      throw new BadRequestException("No se pudo establecer la contraseña");
    }

    const user = await this.usersRepository.findById(userId);

    if (
      !user ||
      user.status !== "ACTIVE" ||
      user.email_verified_at === null ||
      user.password_change_required
    ) {
      throw new UnauthorizedException("No se pudo activar la cuenta");
    }

    return this.createSession(user, sessionMetadata);
  }

  private async createSession(
    user: UserRecord,
    sessionMetadata: LoginSessionMetadata = {},
  ) {
    const accessToken = await this.jwtService.signAsync({ sub: user.id });
    const sessionId = randomUUID();
    const refreshToken = await this.createRefreshToken(user.id, sessionId);
    const refreshTokenHash = await argon2.hash(refreshToken, {
      type: argon2.argon2id,
    });

    await this.userSessionsRepository.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      userAgent: sessionMetadata.userAgent,
      ipAddress: sessionMetadata.ipAddress,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000),
    });

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      refreshToken,
    };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token invalido");
    }

    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.userSessionsRepository.findActiveById(
      payload.sid,
    );

    if (
      !session ||
      session.user_id !== payload.sub ||
      session.user_status !== "ACTIVE" ||
      session.user_email_verified_at === null ||
      session.user_password_change_required
    ) {
      throw new UnauthorizedException("Refresh token invalido");
    }

    const refreshTokenMatches = await argon2.verify(
      session.refresh_token_hash,
      refreshToken,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException("Refresh token invalido");
    }

    const nextRefreshToken = await this.createRefreshToken(
      session.user_id,
      session.id,
    );
    const nextRefreshTokenHash = await argon2.hash(nextRefreshToken, {
      type: argon2.argon2id,
    });
    const rotated = await this.userSessionsRepository.rotate({
      id: session.id,
      userId: session.user_id,
      refreshTokenHash: nextRefreshTokenHash,
    });

    if (!rotated) {
      throw new UnauthorizedException("Refresh token invalido");
    }

    const accessToken = await this.jwtService.signAsync({
      sub: session.user_id,
    });

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      refreshToken: nextRefreshToken,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.userSessionsRepository.revoke(payload.sid, payload.sub);
    } catch (error: unknown) {
      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }
    }
  }

  async me(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (
      !user ||
      user.status !== "ACTIVE" ||
      user.email_verified_at === null ||
      user.password_change_required
    ) {
      throw new UnauthorizedException("Access token invalido");
    }

    const organizations =
      await this.usersRepository.findActiveOrganizationsByUserId(user.id);
    const businesses =
      await this.usersRepository.findAccessibleBusinessesByUserId(user.id);

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified_at !== null,
      preferredLocale: user.preferred_locale,
      isSuperadmin: user.is_superadmin,
      status: user.status,
      createdAt: user.created_at,
      organizations: organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        role: organization.role,
        businesses: businesses
          .filter((business) => business.organization_id === organization.id)
          .map((business) => ({
            id: business.id,
            name: business.name,
            slug: business.slug,
            status: business.status,
          })),
      })),
    };
  }

  async requestEmailVerification(
    requestDto: RequestEmailVerificationDto,
  ): Promise<void> {
    const email = requestDto.email.trim().toLowerCase();
    const user = await this.usersRepository.findByEmail(email);

    if (!user || user.status !== "ACTIVE" || user.email_verified_at !== null) {
      return;
    }

    const token = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.userTokensRepository.replaceEmailVerificationToken({
      userId: user.id,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(
        Date.now() + EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_SECONDS * 1000,
      ),
    });
    await this.emailProvider.sendEmailVerification({
      email: user.email,
      token,
    });
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const verified =
      await this.userTokensRepository.consumeEmailVerificationToken(
        this.hashToken(verifyEmailDto.token),
      );

    if (!verified) {
      throw new BadRequestException(
        "Token de verificacion invalido o caducado",
      );
    }

    return { emailVerified: true };
  }

  async requestPasswordReset(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<void> {
    const email = forgotPasswordDto.email.trim().toLowerCase();
    const user = await this.usersRepository.findByEmail(email);

    if (!user || user.status !== "ACTIVE") {
      return;
    }

    const token = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.userTokensRepository.replacePasswordResetToken({
      userId: user.id,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(
        Date.now() + PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS * 1000,
      ),
    });
    await this.emailProvider.sendPasswordReset({ email: user.email, token });
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const passwordHash = await argon2.hash(resetPasswordDto.password, {
      type: argon2.argon2id,
    });
    const reset = await this.userTokensRepository.consumePasswordResetToken({
      tokenHash: this.hashToken(resetPasswordDto.token),
      passwordHash,
    });

    if (!reset) {
      throw new BadRequestException(
        "Codigo de recuperacion invalido o caducado",
      );
    }
  }

  private async verifyRefreshToken(
    refreshToken: string | undefined,
  ): Promise<RefreshTokenPayload> {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token invÃ¡lido");
    }

    try {
      const payload = await this.jwtService.verifyAsync<
        Record<string, unknown>
      >(refreshToken, {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });

      if (!this.isRefreshTokenPayload(payload)) {
        throw new UnauthorizedException("Refresh token invalido");
      }

      return payload;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Refresh token invalido");
    }
  }

  private async enableTwoFactorForUser(
    userId: string,
    code: string,
  ): Promise<string[]> {
    const state = await this.twoFactorRepository.findState(userId);

    if (!state?.secret_encrypted || state.enabled) {
      throw new BadRequestException(
        "No hay una configuracion de 2FA pendiente",
      );
    }

    const verification = await verify({
      secret: this.decryptTwoFactorSecret(state.secret_encrypted),
      token: code,
    });

    if (!verification.valid) {
      throw new BadRequestException("Codigo TOTP invalido");
    }

    const recoveryCodes = Array.from({ length: 8 }, () =>
      this.createRecoveryCode(),
    );
    const recoveryCodeHashes = await Promise.all(
      recoveryCodes.map((recoveryCode) =>
        argon2.hash(recoveryCode, { type: argon2.argon2id }),
      ),
    );
    await this.twoFactorRepository.enable(userId, recoveryCodeHashes);

    return recoveryCodes;
  }

  private async createTwoFactorAttemptToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, purpose: "TWO_FACTOR_ATTEMPT", jti: randomUUID() },
      {
        secret: this.configService.getOrThrow<string>(
          "JWT_EMAIL_VERIFICATION_SECRET",
        ),
        expiresIn: TWO_FACTOR_ATTEMPT_EXPIRES_IN_SECONDS,
      },
    );
  }

  private async verifyTwoFactorAttemptToken(
    twoFactorAttemptToken: string | undefined,
  ): Promise<string> {
    if (!twoFactorAttemptToken) {
      throw new UnauthorizedException("Intento de segundo factor invalido");
    }

    try {
      const payload = await this.jwtService.verifyAsync<
        Record<string, unknown>
      >(twoFactorAttemptToken, {
        secret: this.configService.getOrThrow<string>(
          "JWT_EMAIL_VERIFICATION_SECRET",
        ),
      });

      if (!this.isTwoFactorAttemptPayload(payload)) {
        throw new UnauthorizedException("Intento de segundo factor invalido");
      }

      return payload.sub;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Intento de segundo factor invalido");
    }
  }

  private isTwoFactorAttemptPayload(
    value: Record<string, unknown>,
  ): value is TwoFactorAttemptPayload & Record<string, unknown> {
    return (
      value.sub !== undefined &&
      typeof value.sub === "string" &&
      value.purpose === "TWO_FACTOR_ATTEMPT" &&
      typeof value.jti === "string"
    );
  }

  private encryptTwoFactorSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      this.getTwoFactorEncryptionKey(),
      iv,
    );
    const ciphertext = Buffer.concat([
      cipher.update(secret, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [iv, tag, ciphertext]
      .map((value) => value.toString("base64url"))
      .join(".");
  }

  private decryptTwoFactorSecret(encryptedSecret: string): string {
    const [iv, tag, ciphertext] = encryptedSecret
      .split(".")
      .map((value) => Buffer.from(value, "base64url"));

    if (!iv || !tag || !ciphertext) {
      throw new UnauthorizedException("Segundo factor invalido");
    }

    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.getTwoFactorEncryptionKey(),
        iv,
      );
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new UnauthorizedException("Segundo factor invalido");
    }
  }

  private getTwoFactorEncryptionKey(): Buffer {
    return createHash("sha256")
      .update(this.configService.getOrThrow<string>("TOTP_ENCRYPTION_KEY"))
      .digest();
  }

  private createRecoveryCode(): string {
    return randomBytes(6)
      .toString("hex")
      .toUpperCase()
      .match(/.{1,4}/g)!
      .join("-");
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private assertInitialOnboardingCredentials(
    onboardingSecret: string | undefined,
  ): void {
    const expectedSecret =
      this.configService.getOrThrow<string>("ONBOARDING_SECRET");

    const expectedSecretBuffer = Buffer.from(expectedSecret);
    const receivedSecretBuffer = Buffer.from(onboardingSecret ?? "");
    const secretMatches =
      expectedSecretBuffer.length === receivedSecretBuffer.length &&
      timingSafeEqual(expectedSecretBuffer, receivedSecretBuffer);

    if (!secretMatches) {
      throw new ForbiddenException("Credenciales de onboarding invalidas");
    }
  }

  private createTemporaryPassword(): string {
    return randomBytes(6).toString("base64url");
  }

  private async createEmailVerificationAttemptToken(
    userId: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        purpose: "EMAIL_VERIFICATION_ATTEMPT",
        jti: randomUUID(),
      },
      {
        secret: this.configService.getOrThrow<string>(
          "JWT_EMAIL_VERIFICATION_SECRET",
        ),
        expiresIn: EMAIL_VERIFICATION_ATTEMPT_EXPIRES_IN_SECONDS,
      },
    );
  }

  private async verifyEmailVerificationAttemptToken(
    verificationAttemptToken: string | undefined,
  ): Promise<string> {
    if (!verificationAttemptToken) {
      throw new UnauthorizedException("Intento de activacion invalido");
    }

    try {
      const payload = await this.jwtService.verifyAsync<
        Record<string, unknown>
      >(verificationAttemptToken, {
        secret: this.configService.getOrThrow<string>(
          "JWT_EMAIL_VERIFICATION_SECRET",
        ),
      });

      if (!this.isEmailVerificationAttemptPayload(payload)) {
        throw new UnauthorizedException("Intento de activacion invalido");
      }

      return payload.sub;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Intento de activacion invalido");
    }
  }

  private async createPasswordActivationAttemptToken(
    userId: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        purpose: "PASSWORD_ACTIVATION_ATTEMPT",
        jti: randomUUID(),
      },
      {
        secret: this.configService.getOrThrow<string>(
          "JWT_EMAIL_VERIFICATION_SECRET",
        ),
        expiresIn: EMAIL_VERIFICATION_ATTEMPT_EXPIRES_IN_SECONDS,
      },
    );
  }

  private async verifyPasswordActivationAttemptToken(
    passwordActivationAttemptToken: string | undefined,
  ): Promise<string> {
    if (!passwordActivationAttemptToken) {
      throw new UnauthorizedException("Intento de activacion invalido");
    }

    try {
      const payload = await this.jwtService.verifyAsync<
        Record<string, unknown>
      >(passwordActivationAttemptToken, {
        secret: this.configService.getOrThrow<string>(
          "JWT_EMAIL_VERIFICATION_SECRET",
        ),
      });

      if (!this.isPasswordActivationAttemptPayload(payload)) {
        throw new UnauthorizedException("Intento de activacion invalido");
      }

      return payload.sub;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Intento de activacion invalido");
    }
  }

  private async createRefreshToken(userId: string, sessionId: string) {
    return this.jwtService.signAsync(
      { sub: userId, sid: sessionId, jti: randomUUID() },
      {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
      },
    );
  }

  private isRefreshTokenPayload(value: unknown): value is RefreshTokenPayload {
    return (
      typeof value === "object" &&
      value !== null &&
      "sub" in value &&
      typeof value.sub === "string" &&
      "sid" in value &&
      typeof value.sid === "string" &&
      "jti" in value &&
      typeof value.jti === "string"
    );
  }

  private isEmailVerificationAttemptPayload(
    value: Record<string, unknown>,
  ): value is EmailVerificationAttemptPayload & Record<string, unknown> {
    return (
      typeof value.sub === "string" &&
      value.purpose === "EMAIL_VERIFICATION_ATTEMPT" &&
      typeof value.jti === "string"
    );
  }

  private isPasswordActivationAttemptPayload(
    value: Record<string, unknown>,
  ): value is PasswordActivationAttemptPayload & Record<string, unknown> {
    return (
      typeof value.sub === "string" &&
      value.purpose === "PASSWORD_ACTIVATION_ATTEMPT" &&
      typeof value.jti === "string"
    );
  }

  private isDuplicateEmailError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    );
  }
}
