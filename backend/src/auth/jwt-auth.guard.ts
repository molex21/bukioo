import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

interface AccessTokenPayload {
  sub: string;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = this.getAccessToken(request.headers.authorization);

    try {
      const payload = await this.jwtService.verifyAsync<
        Record<string, unknown>
      >(accessToken, {
        secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });

      if (!this.isAccessTokenPayload(payload)) {
        throw new UnauthorizedException("Access token invalido");
      }

      request.userId = payload.sub;
      return true;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

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

  private isAccessTokenPayload(
    value: Record<string, unknown>,
  ): value is AccessTokenPayload & Record<string, unknown> {
    return "sub" in value && typeof value.sub === "string";
  }
}
