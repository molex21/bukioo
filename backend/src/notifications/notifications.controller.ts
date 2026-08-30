import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ListNotificationsDto } from "./dto/list-notifications.dto";
import { NotificationsService } from "./notifications.service";

@Controller("businesses/:businessId/notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: ListNotificationsDto,
    @CurrentUser() userId: string,
  ) {
    return this.notificationsService.list(businessId, filters, userId);
  }
}
