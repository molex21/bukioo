import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsRepository } from "./appointments.repository";
import { AppointmentsService } from "./appointments.service";
import { RescheduleProposalsController } from "./reschedule-proposals.controller";
import { AuditService } from "../audit/audit.service";
import { LoyaltyModule } from "../loyalty/loyalty.module";

@Module({
  imports: [AuthModule, LoyaltyModule],
  controllers: [AppointmentsController, RescheduleProposalsController],
  providers: [AppointmentsService, AppointmentsRepository, AuditService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
