import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SchedulingRepository } from "./scheduling.repository";
import { SchedulingService } from "./scheduling.service";
import { SchedulingController } from "./scheduling.controller";

@Module({
  imports: [AuthModule],
  controllers: [SchedulingController],
  providers: [SchedulingRepository, SchedulingService],
})
export class SchedulingModule {}
