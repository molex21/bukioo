import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CalendarBlocksController } from "./calendar-blocks.controller";
import { CalendarBlocksRepository } from "./calendar-blocks.repository";
import { CalendarBlocksService } from "./calendar-blocks.service";
@Module({
  imports: [AuthModule],
  controllers: [CalendarBlocksController],
  providers: [CalendarBlocksService, CalendarBlocksRepository],
})
export class CalendarBlocksModule {}
