import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { LoyaltyController } from "./loyalty.controller";
import { LoyaltySettingsController } from "./loyalty-settings.controller";
import { CustomerLoyaltyController } from "./customer-loyalty.controller";
import { LoyaltyRepository } from "./loyalty.repository";
import { LoyaltyService } from "./loyalty.service";

@Module({
  imports: [AuthModule],
  controllers: [
    LoyaltyController,
    LoyaltySettingsController,
    CustomerLoyaltyController,
  ],
  providers: [LoyaltyService, LoyaltyRepository],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
