import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsRepository } from "./appointments.repository";
import { AppointmentsService } from "./appointments.service";
import { RescheduleProposalsController } from "./reschedule-proposals.controller";
import { AuditModule } from "../audit/audit.module";
import { LoyaltyModule } from "../loyalty/loyalty.module";

@Module({
  imports: [AuthModule, LoyaltyModule, AuditModule],
  controllers: [AppointmentsController, RescheduleProposalsController],
  providers: [AppointmentsService, AppointmentsRepository],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
