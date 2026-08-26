import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkingHoursController } from "./working-hours.controller";
import { WorkingHoursRepository } from "./working-hours.repository";
import { WorkingHoursService } from "./working-hours.service";

@Module({
  imports: [AuthModule],
  controllers: [WorkingHoursController],
  providers: [WorkingHoursService, WorkingHoursRepository],
})
export class WorkingHoursModule {}
