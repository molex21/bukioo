import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoyaltyModule } from "../loyalty/loyalty.module";
import { LoyaltyExpirationWorker } from "./loyalty-expiration.worker";
import { createPgBoss, PG_BOSS } from "./pg-boss.provider";

@Module({
  imports: [LoyaltyModule],
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
