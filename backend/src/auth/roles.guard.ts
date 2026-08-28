import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import {
  AUTHORIZATION_SCOPE_KEY,
  type AuthorizationScope,
} from "./authorization-scope.decorator";
import { AuthorizationRepository } from "./authorization.repository";
import { type AuthenticatedRequest } from "./jwt-auth.guard";
import { ROLES_KEY, type OrganizationRole } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationRepository: AuthorizationRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<OrganizationRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles || roles.length === 0) {
      return true;
    }

    const scope = this.reflector.getAllAndOverride<AuthorizationScope>(
      AUTHORIZATION_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.userId) {
      throw new UnauthorizedException("Access token invalido");
    }

    const resourceId = this.getResourceId(request, scope);

    if (!resourceId) {
      throw new ForbiddenException("Contexto de autorizacion invalido");
    }

    const role =
      scope.resource === "organization"
        ? await this.authorizationRepository.findOrganizationRole(
            request.userId,
            resourceId,
          )
        : await this.authorizationRepository.findBusinessRole(
            request.userId,
            resourceId,
          );

    if (!role || !roles.includes(role)) {
      throw new ForbiddenException("No tienes permiso para esta operacion");
    }

    return true;
  }

  private getResourceId(
    request: AuthenticatedRequest,
    scope: AuthorizationScope | undefined,
  ): string | undefined {
    if (!scope) {
      return undefined;
    }

    const source = request[scope.source] as Record<string, unknown> | undefined;
    const value = source?.[scope.key];

    return typeof value === "string" ? value : undefined;
  }
}
