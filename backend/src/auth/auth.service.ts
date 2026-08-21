import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { randomUUID } from "crypto";
import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  REFRESH_TOKEN_EXPIRES_IN_SECONDS,
} from "./auth.constants";
import { LoginDto } from "./dto/login.dto";
import { OnboardDto } from "./dto/onboard.dto";
import { RegisterDto } from "./dto/register.dto";
import { OnboardingRepository } from "./onboarding.repository";
import { UserSessionsRepository } from "./user-sessions.repository";
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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly userSessionsRepository: UserSessionsRepository,
    private readonly onboardingRepository: OnboardingRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();

    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException("Ya existe una cuenta con este email");
    }

    const passwordHash = await argon2.hash(registerDto.password, {
      type: argon2.argon2id,
    });

    let user: UserRecord;

    try {
      user = await this.usersRepository.create(email, passwordHash);
    } catch (error: unknown) {
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException("Ya existe una cuenta con este email");
      }

      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified_at !== null,
      createdAt: user.created_at,
    };
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

  async onboard(onboardDto: OnboardDto) {
    const email = onboardDto.email.trim().toLowerCase();
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException("Ya existe una cuenta con este email");
    }

    const passwordHash = await argon2.hash(onboardDto.password, {
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
      session.user_status !== "ACTIVE"
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

  private isDuplicateEmailError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    );
  }
}
