import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthenticatedRequest } from "../auth/jwt-auth.guard";
import { SuperadminRepository } from "./superadmin.repository";

@Injectable()
export class SuperadminGuard implements CanActivate {
  constructor(private readonly repository: SuperadminRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.userId) {
      throw new UnauthorizedException("Access token invalido");
    }
    if (!(await this.repository.isActiveSuperadmin(request.userId))) {
      throw new ForbiddenException("Requiere permisos de superadmin");
    }
    return true;
  }
}
