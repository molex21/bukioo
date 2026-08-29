import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { LoyaltyController } from "./loyalty.controller";
import { LoyaltyRepository } from "./loyalty.repository";
import { LoyaltyService } from "./loyalty.service";

@Module({
  imports: [AuthModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService, LoyaltyRepository],
})
export class LoyaltyModule {}
