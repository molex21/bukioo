import { Module } from "@nestjs/common";
import { AvailabilityModule } from "../availability/availability.module";
import { PublicBookingController } from "./public-booking.controller";
import { PublicBookingRepository } from "./public-booking.repository";
import { PublicBookingService } from "./public-booking.service";

@Module({
  imports: [AvailabilityModule],
  controllers: [PublicBookingController],
  providers: [PublicBookingService, PublicBookingRepository],
})
export class PublicBookingModule {}
