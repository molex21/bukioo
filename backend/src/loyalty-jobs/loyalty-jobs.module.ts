import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoyaltyModule } from "../loyalty/loyalty.module";
import { AppointmentsModule } from "../appointments/appointments.module";
import { LoyaltyExpirationWorker } from "./loyalty-expiration.worker";
import { createPgBoss, PG_BOSS } from "./pg-boss.provider";

@Module({
  imports: [LoyaltyModule, AppointmentsModule],
  providers: [
    {
      provide: PG_BOSS,
      inject: [ConfigService],
      useFactory: createPgBoss,
    },
    LoyaltyExpirationWorker,
  ],
})
export class LoyaltyJobsModule {}
