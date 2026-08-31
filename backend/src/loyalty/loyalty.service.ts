import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EmailProvider } from "../auth/email.provider";
import { CreateLoyaltyLevelDto } from "./dto/create-loyalty-level.dto";
import { UpdateLoyaltyLevelDto } from "./dto/update-loyalty-level.dto";
import { UpdateLoyaltySettingsDto } from "./dto/update-loyalty-settings.dto";
import {
  LoyaltyRepository,
  type LoyaltyAppointmentInput,
  type LoyaltyLevelRecord,
  type LoyaltyRedemptionRecord,
  type LoyaltySettingsRecord,
} from "./loyalty.repository";
import {
  type LoyaltyEarningType,
  type LoyaltyRuleSnapshot,
} from "./loyalty.types";

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly loyaltyRepository: LoyaltyRepository,
    @Inject(EmailProvider) private readonly emailProvider: EmailProvider,
  ) {}

  async create(
    businessId: string,
    dto: CreateLoyaltyLevelDto,
    userId: string,
  ): Promise<LoyaltyLevelRecord> {
    await this.assertCanManageBusiness(userId, businessId);
    return this.loyaltyRepository.create(businessId, {
      ...dto,
      name: dto.name.trim(),
    });
  }

  async list(
    businessId: string,
    userId: string,
  ): Promise<LoyaltyLevelRecord[]> {
    await this.assertCanAccessBusiness(userId, businessId);
    return this.loyaltyRepository.listByBusiness(businessId);
  }

  async getSettings(
    businessId: string,
    userId: string,
  ): Promise<LoyaltySettingsRecord> {
    await this.assertCanAccessBusiness(userId, businessId);
    return this.getSettingsForBusiness(businessId);
  }

  async updateSettings(
    businessId: string,
    dto: UpdateLoyaltySettingsDto,
    userId: string,
  ): Promise<LoyaltySettingsRecord> {
    await this.assertCanManageBusiness(userId, businessId);
    const settings = await this.getSettingsForBusiness(businessId);
    const loyaltyEnabled = dto.loyaltyEnabled ?? settings.loyalty_enabled;
    const earningType =
      dto.defaultLoyaltyEarningType ?? settings.default_earning_type;
    const fixedPoints =
      dto.defaultLoyaltyFixedPoints ?? settings.default_fixed_points;
    const pointsPerCurrencyUnit =
      dto.defaultLoyaltyPointsPerCurrencyUnit ??
      (settings.default_points_per_currency_unit === null
        ? null
        : Number(settings.default_points_per_currency_unit));

    if (loyaltyEnabled) {
      this.assertEarningConfiguration(
        earningType,
        pointsPerCurrencyUnit,
        fixedPoints,
      );
    }

    return this.loyaltyRepository.updateSettings(settings, dto);
  }

  async resolveRuleForBooking(
    businessId: string,
    service: {
      loyalty_earning_type: LoyaltyEarningType;
      loyalty_fixed_points: number | null;
      loyalty_points_per_currency_unit: string | null;
    },
  ): Promise<LoyaltyRuleSnapshot> {
    const settings = await this.getSettingsForBusiness(businessId);
    if (service.loyalty_earning_type === "INHERIT") {
      return {
        type: settings.default_earning_type,
        fixedPoints: settings.default_fixed_points,
        pointsPerCurrencyUnit:
          settings.default_points_per_currency_unit === null
            ? null
            : Number(settings.default_points_per_currency_unit),
      };
    }

    return {
      type: service.loyalty_earning_type,
      fixedPoints: service.loyalty_fixed_points,
      pointsPerCurrencyUnit:
        service.loyalty_points_per_currency_unit === null
          ? null
          : Number(service.loyalty_points_per_currency_unit),
    };
  }

  async reconcileAppointment(
    appointment: LoyaltyAppointmentInput,
    actorUserId: string | null,
  ): Promise<void> {
    await this.loyaltyRepository.reconcileAppointment(appointment, actorUserId);
  }

  async getCustomerLoyalty(
    businessId: string,
    customerId: string,
    userId: string,
  ) {
    await this.assertCanAccessBusiness(userId, businessId);
    const loyalty = await this.loyaltyRepository.getCustomerLoyalty(
      businessId,
      customerId,
    );
    if (!loyalty) throw new NotFoundException("Cliente no encontrado");
    return loyalty;
  }

  async adjustCustomerPoints(
    businessId: string,
    customerId: string,
    points: number,
    reason: string,
    userId: string,
  ): Promise<void> {
    await this.assertCanManageBusiness(userId, businessId);
    if (points === 0) {
      throw new ConflictException("El ajuste de puntos no puede ser cero");
    }
    try {
      await this.loyaltyRepository.adjustCustomerPoints({
        businessId,
        customerId,
        points,
        reason: reason.trim(),
        actorUserId: userId,
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message === "LOYALTY_NEGATIVE_BALANCE"
      ) {
        throw new ConflictException("El ajuste no puede dejar saldo negativo");
      }
      if (
        error instanceof Error &&
        error.message === "LOYALTY_CUSTOMER_NOT_FOUND"
      ) {
        throw new NotFoundException("Cliente no encontrado");
      }
      throw error;
    }
  }

  async redeemCustomerPoints(
    businessId: string,
    customerId: string,
    points: number,
    reason: string,
    userId: string,
  ): Promise<LoyaltyRedemptionRecord> {
    await this.assertCanManageBusiness(userId, businessId);
    try {
      return await this.loyaltyRepository.redeemCustomerPoints({
        businessId,
        customerId,
        points,
        reason: reason.trim(),
        actorUserId: userId,
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.message === "LOYALTY_INSUFFICIENT_POINTS" ||
          error.message === "LOYALTY_INSUFFICIENT_REDEEMABLE_POINTS")
      ) {
        throw new ConflictException("El cliente no tiene puntos suficientes");
      }
      if (
        error instanceof Error &&
        error.message === "LOYALTY_CUSTOMER_NOT_FOUND"
      ) {
        throw new NotFoundException("Cliente no encontrado");
      }
      throw error;
    }
  }

  async expireDuePoints(): Promise<number> {
    return this.loyaltyRepository.expireDuePoints();
  }

  async sendExpirationNotices(
    daysBeforeExpiration: 30 | 7,
  ): Promise<{ sent: number; failed: number }> {
    const notices =
      await this.loyaltyRepository.prepareExpirationNotices(
        daysBeforeExpiration,
      );
    let sent = 0;
    let failed = 0;

    for (const notice of notices) {
      try {
        await this.emailProvider.sendPointsExpiration({
          email: notice.email,
          businessName: notice.business_name,
          points: notice.points,
          expiresAt: notice.expires_at,
          timezone: notice.timezone,
          daysBeforeExpiration: notice.days_before_expiration,
        });
        await this.loyaltyRepository.markExpirationNoticeSent(notice.id);
        sent += 1;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Error desconocido al enviar";
        await this.loyaltyRepository.markExpirationNoticeFailed(
          notice.id,
          errorMessage,
        );
        failed += 1;
      }
    }

    return { sent, failed };
  }

  async update(
    businessId: string,
    levelId: string,
    dto: UpdateLoyaltyLevelDto,
    userId: string,
  ): Promise<LoyaltyLevelRecord> {
    await this.assertCanManageBusiness(userId, businessId);
    const level = await this.getLevel(businessId, levelId);
    return this.loyaltyRepository.update(level, {
      ...dto,
      name: dto.name?.trim(),
    });
  }

  async remove(
    businessId: string,
    levelId: string,
    userId: string,
  ): Promise<void> {
    await this.assertCanManageBusiness(userId, businessId);
    const level = await this.getLevel(businessId, levelId);

    if ((await this.loyaltyRepository.countCustomers(level)) > 0) {
      throw new ConflictException(
        "No se puede eliminar un nivel con clientes asociados",
      );
    }

    if (!(await this.loyaltyRepository.remove(level))) {
      throw new NotFoundException("Nivel de fidelizacion no encontrado");
    }
  }

  private async assertCanAccessBusiness(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (!(await this.loyaltyRepository.canAccessBusiness(userId, businessId))) {
      throw new ForbiddenException("No tienes acceso a este negocio");
    }
  }

  private async assertCanManageBusiness(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (!(await this.loyaltyRepository.canManageBusiness(userId, businessId))) {
      throw new ForbiddenException(
        "No tienes permiso para gestionar fidelizacion",
      );
    }
  }

  private async getLevel(
    businessId: string,
    levelId: string,
  ): Promise<LoyaltyLevelRecord> {
    const level = await this.loyaltyRepository.findById(businessId, levelId);

    if (!level) {
      throw new NotFoundException("Nivel de fidelizacion no encontrado");
    }

    return level;
  }

  private async getSettingsForBusiness(
    businessId: string,
  ): Promise<LoyaltySettingsRecord> {
    const settings =
      await this.loyaltyRepository.findSettingsByBusiness(businessId);

    if (!settings) {
      throw new NotFoundException(
        "Configuracion de fidelizacion no encontrada",
      );
    }

    return settings;
  }

  private assertEarningConfiguration(
    type: LoyaltySettingsRecord["default_earning_type"],
    pointsPerCurrencyUnit: number | null,
    fixedPoints: number | null,
  ): void {
    if (type === "NONE") {
      throw new ConflictException(
        "Debes indicar una regla de puntos para activar fidelizacion",
      );
    }

    if (
      (type === "AMOUNT_MULTIPLIER" || type === "BOTH") &&
      pointsPerCurrencyUnit === null
    ) {
      throw new ConflictException(
        "Debes indicar puntos por unidad monetaria para este modo",
      );
    }

    if ((type === "FIXED" || type === "BOTH") && fixedPoints === null) {
      throw new ConflictException(
        "Debes indicar puntos por cita completada para este modo",
      );
    }
  }
}
