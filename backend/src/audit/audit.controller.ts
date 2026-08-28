import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from "../auth/jwt-auth.guard";
import { AuditService } from "./audit.service";
import { ListAuditLogsDto } from "./dto/list-audit-logs.dto";
@Controller("businesses/:businessId/audit-logs")
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}
  @Get() list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: ListAuditLogsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auditService.list(businessId, filters, request.userId!);
  }
}
