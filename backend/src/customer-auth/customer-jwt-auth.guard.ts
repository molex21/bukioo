import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { CustomerAuthRepository } from "./customer-auth.repository";

interface CustomerAccessTokenPayload {
  sub: string;
  organizationId: string;
  type: "CUSTOMER";
}

export interface CustomerAuthenticatedRequest extends Request {
  customer?: {
    id: string;
    organizationId: string;
  };
}

@Injectable()
export class CustomerJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly repo: CustomerAuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<CustomerAuthenticatedRequest>();
    const token = this.getAccessToken(request.headers.authorization);

    try {
      const payload = await this.jwt.verifyAsync<Record<string, unknown>>(
        token,
        { secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET") },
      );
      if (!this.isCustomerAccessToken(payload)) {
        throw new UnauthorizedException("Access token invalido");
      }

      const slug = request.params.organizationSlug;
      if (typeof slug !== "string") {
        throw new UnauthorizedException("Access token invalido");
      }
      const organization = await this.repo.findOrganization(slug);
      const account = organization
        ? await this.repo.findActiveAccountById(organization.id, payload.sub)
        : null;
      if (!account || account.organization_id !== payload.organizationId) {
        throw new UnauthorizedException("Access token invalido");
      }

      request.customer = {
        id: account.id,
        organizationId: account.organization_id,
      };
      return true;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Access token invalido");
    }
  }

  private getAccessToken(authorization: string | undefined): string {
    const [scheme, token, ...extraParts] = authorization?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token || extraParts.length > 0) {
      throw new UnauthorizedException("Access token invalido");
    }
    return token;
  }

  private isCustomerAccessToken(
    payload: Record<string, unknown>,
  ): payload is CustomerAccessTokenPayload & Record<string, unknown> {
    return (
      typeof payload.sub === "string" &&
      typeof payload.organizationId === "string" &&
      payload.type === "CUSTOMER"
    );
  }
}
