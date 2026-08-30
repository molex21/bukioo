import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationSettingsController } from "./notification-settings.controller";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController, NotificationSettingsController],
  providers: [NotificationsRepository, NotificationsService],
})
export class NotificationsModule {}
