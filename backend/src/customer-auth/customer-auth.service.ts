import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { randomUUID } from "crypto";
import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  REFRESH_TOKEN_EXPIRES_IN_SECONDS,
} from "../auth/auth.constants";
import { LoginProtectionRepository } from "../auth/login-protection.repository";
import {
  CustomerAccount,
  CustomerAuthRepository,
} from "./customer-auth.repository";
import { LoginCustomerDto } from "./dto/login-customer.dto";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly repo: CustomerAuthRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly loginProtectionRepository: LoginProtectionRepository,
  ) {}
  async register(slug: string, dto: RegisterCustomerDto) {
    const org = await this.repo.findOrganization(slug.trim());
    if (!org) throw new NotFoundException("Organizacion no encontrada");
    const email = dto.email.trim().toLowerCase();
    if (await this.repo.findAccount(org.id, email))
      throw new ConflictException(
        "Ya existe una cuenta de cliente con este email",
      );
    const account = await this.repo.createAccount(
      org.id,
      email,
      await argon2.hash(dto.password, { type: argon2.argon2id }),
    );
    await this.repo.linkCustomers(org.id, email, account.id);
    return this.createAuthenticatedSession(account);
  }

  async login(slug: string, dto: LoginCustomerDto) {
    const org = await this.repo.findOrganization(slug.trim());
    if (!org) throw new UnauthorizedException("Credenciales invalidas");

    const account = await this.repo.findAccountForLogin(
      org.id,
      dto.email.trim().toLowerCase(),
    );
    if (!account || account.status !== "ACTIVE") {
      throw new UnauthorizedException("Credenciales invalidas");
    }

    if (
      await this.loginProtectionRepository.isCustomerAccountLocked(account.id)
    ) {
      throw new UnauthorizedException("Credenciales invalidas");
    }

    if (!(await argon2.verify(account.password_hash, dto.password))) {
      await this.loginProtectionRepository.recordCustomerAccountFailure(
        account.id,
      );
      throw new UnauthorizedException("Credenciales invalidas");
    }

    await this.loginProtectionRepository.clearCustomerAccountFailures(
      account.id,
    );

    return this.createAuthenticatedSession(account);
  }

  async refresh(slug: string, refreshToken: string | undefined) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const org = await this.repo.findOrganization(slug.trim());
    const session = await this.repo.findActiveSession(payload.sid);

    if (
      !org ||
      !session ||
      payload.sub !== session.customer_account_id ||
      payload.organizationId !== org.id ||
      session.organization_id !== org.id ||
      session.account_status !== "ACTIVE" ||
      !(await argon2.verify(session.refresh_token_hash, refreshToken!))
    ) {
      throw new UnauthorizedException("Refresh token invalido");
    }

    const nextRefreshToken = await this.createRefreshToken(
      session.customer_account_id,
      session.organization_id,
      session.id,
    );
    const rotated = await this.repo.rotateSession(
      session.id,
      session.customer_account_id,
      await argon2.hash(nextRefreshToken, { type: argon2.argon2id }),
    );
    if (!rotated) throw new UnauthorizedException("Refresh token invalido");

    return {
      accessToken: await this.createAccessToken(
        session.customer_account_id,
        session.organization_id,
      ),
      refreshToken: nextRefreshToken,
      tokenType: "Bearer",
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    };
  }

  async logout(slug: string, refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;

    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      const org = await this.repo.findOrganization(slug.trim());
      if (org && payload.organizationId === org.id) {
        await this.repo.revokeSession(payload.sid, payload.sub);
      }
    } catch (error: unknown) {
      if (!(error instanceof UnauthorizedException)) throw error;
    }
  }

  async me(organizationId: string, accountId: string) {
    const account = await this.repo.findActiveAccountById(
      organizationId,
      accountId,
    );
    if (!account) throw new UnauthorizedException("Access token invalido");

    return {
      id: account.id,
      email: account.email,
      organizationId: account.organization_id,
    };
  }

  private async createAuthenticatedSession(account: CustomerAccount) {
    const sessionId = randomUUID();
    const refreshToken = await this.createRefreshToken(
      account.id,
      account.organization_id,
      sessionId,
    );
    await this.repo.createSession(
      sessionId,
      account.id,
      await argon2.hash(refreshToken, { type: argon2.argon2id }),
      new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000),
    );
    return {
      accessToken: await this.createAccessToken(
        account.id,
        account.organization_id,
      ),
      refreshToken,
      tokenType: "Bearer",
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      customer: {
        id: account.id,
        email: account.email,
        organizationId: account.organization_id,
      },
      sessionId,
    };
  }

  private createAccessToken(accountId: string, organizationId: string) {
    return this.jwt.signAsync(
      { sub: accountId, organizationId, type: "CUSTOMER" },
      {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      },
    );
  }

  private createRefreshToken(
    accountId: string,
    organizationId: string,
    sessionId: string,
  ) {
    return this.jwt.signAsync(
      {
        sub: accountId,
        organizationId,
        sid: sessionId,
        jti: randomUUID(),
        type: "CUSTOMER",
      },
      {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS,
      },
    );
  }

  private async verifyRefreshToken(refreshToken: string | undefined) {
    if (!refreshToken)
      throw new UnauthorizedException("Refresh token invalido");

    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(
        refreshToken,
        { secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET") },
      );
      if (
        typeof payload.sub !== "string" ||
        typeof payload.organizationId !== "string" ||
        typeof payload.sid !== "string" ||
        typeof payload.jti !== "string" ||
        payload.type !== "CUSTOMER"
      ) {
        throw new UnauthorizedException("Refresh token invalido");
      }
      return {
        sub: payload.sub,
        organizationId: payload.organizationId,
        sid: payload.sid,
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Refresh token invalido");
    }
  }
}
