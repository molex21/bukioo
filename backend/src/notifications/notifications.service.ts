import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ListNotificationsDto } from "./dto/list-notifications.dto";
import { UpdateNotificationSettingsDto } from "./dto/update-notification-settings.dto";
import { NotificationsRepository } from "./notifications.repository";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async list(
    businessId: string,
    filters: ListNotificationsDto,
    userId: string,
  ) {
    if (
      filters.from &&
      filters.to &&
      new Date(filters.from) >= new Date(filters.to)
    ) {
      throw new BadRequestException(
        "La fecha from debe ser anterior a la fecha to",
      );
    }
    if (
      !(await this.notificationsRepository.canManageBusiness(
        userId,
        businessId,
      ))
    ) {
      throw new ForbiddenException(
        "No tienes permiso para consultar las notificaciones",
      );
    }
    return this.notificationsRepository.listByBusiness(businessId, filters);
  }

  async getSettings(businessId: string, userId: string) {
    if (
      !(await this.notificationsRepository.canAccessBusiness(
        userId,
        businessId,
      ))
    ) {
      throw new ForbiddenException(
        "No tienes permiso para consultar la configuracion de notificaciones",
      );
    }
    return this.getSettingsForBusiness(businessId);
  }

  async updateSettings(
    businessId: string,
    dto: UpdateNotificationSettingsDto,
    userId: string,
  ) {
    if (
      !(await this.notificationsRepository.canManageBusiness(
        userId,
        businessId,
      ))
    ) {
      throw new ForbiddenException(
        "No tienes permiso para modificar la configuracion de notificaciones",
      );
    }
    const settings = await this.getSettingsForBusiness(businessId);
    return this.notificationsRepository.updateSettings(settings, dto);
  }

  private async getSettingsForBusiness(businessId: string) {
    const settings =
      await this.notificationsRepository.findSettingsByBusiness(businessId);
    if (!settings) {
      throw new NotFoundException(
        "Configuracion de notificaciones no encontrada",
      );
    }
    return settings;
  }
}
