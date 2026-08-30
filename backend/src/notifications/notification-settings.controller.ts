import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UpdateNotificationSettingsDto } from "./dto/update-notification-settings.dto";
import { NotificationsService } from "./notifications.service";

@Controller("businesses/:businessId/notification-settings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationSettingsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  get(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @CurrentUser() userId: string,
  ) {
    return this.notificationsService.getSettings(businessId, userId);
  }

  @Patch()
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() dto: UpdateNotificationSettingsDto,
    @CurrentUser() userId: string,
  ) {
    return this.notificationsService.updateSettings(businessId, dto, userId);
  }
}
