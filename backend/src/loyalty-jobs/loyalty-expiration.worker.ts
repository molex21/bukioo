import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { LoyaltyService } from "../loyalty/loyalty.service";
import { AppointmentsService } from "../appointments/appointments.service";
import { PG_BOSS, type PgBossClient } from "./pg-boss.provider";

export const LOYALTY_EXPIRATION_JOB = "loyalty.expire-points";
export const LOYALTY_EXPIRATION_NOTICE_30_DAYS_JOB =
  "loyalty.send-expiration-notices-30-days";
export const LOYALTY_EXPIRATION_NOTICE_7_DAYS_JOB =
  "loyalty.send-expiration-notices-7-days";
export const APPOINTMENT_REMINDER_JOB = "appointments.send-reminders";

@Injectable()
export class LoyaltyExpirationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoyaltyExpirationWorker.name);

  constructor(
    @Inject(PG_BOSS) private readonly pgBoss: PgBossClient | null,
    private readonly loyaltyService: LoyaltyService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.pgBoss) return;

    await this.pgBoss.start();
    await this.pgBoss.work(LOYALTY_EXPIRATION_JOB, async () => {
      const expired = await this.loyaltyService.expireDuePoints();
      if (expired > 0) {
        this.logger.log(`Caducados ${expired} movimientos de fidelizacion`);
      }
    });
    await this.pgBoss.work(LOYALTY_EXPIRATION_NOTICE_30_DAYS_JOB, async () => {
      await this.sendExpirationNotices(30);
    });
    await this.pgBoss.work(LOYALTY_EXPIRATION_NOTICE_7_DAYS_JOB, async () => {
      await this.sendExpirationNotices(7);
    });
    await this.pgBoss.work(APPOINTMENT_REMINDER_JOB, async () => {
      await this.sendAppointmentReminders();
    });
    await this.pgBoss.schedule(LOYALTY_EXPIRATION_JOB, "0 * * * *");
    await this.pgBoss.schedule(
      LOYALTY_EXPIRATION_NOTICE_30_DAYS_JOB,
      "15 8 * * *",
    );
    await this.pgBoss.schedule(
      LOYALTY_EXPIRATION_NOTICE_7_DAYS_JOB,
      "15 8 * * *",
    );
    await this.pgBoss.schedule(APPOINTMENT_REMINDER_JOB, "*/15 * * * *");
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pgBoss) await this.pgBoss.stop();
  }

  private async sendExpirationNotices(
    daysBeforeExpiration: 30 | 7,
  ): Promise<void> {
    const result =
      await this.loyaltyService.sendExpirationNotices(daysBeforeExpiration);
    if (result.sent > 0 || result.failed > 0) {
      this.logger.log(
        `Avisos de caducidad a ${daysBeforeExpiration} dias: ${result.sent} enviados, ${result.failed} fallidos`,
      );
    }
  }

  private async sendAppointmentReminders(): Promise<void> {
    const result = await this.appointmentsService.sendAppointmentReminders();
    if (result.sent > 0 || result.failed > 0) {
      this.logger.log(
        `Recordatorios de cita: ${result.sent} enviados, ${result.failed} fallidos`,
      );
    }
  }
}
