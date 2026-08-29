import { Module } from "@nestjs/common";
import { AvailabilityModule } from "../availability/availability.module";
import { AppointmentsModule } from "../appointments/appointments.module";
import { PublicBookingController } from "./public-booking.controller";
import { PublicAppointmentsController } from "./public-appointments.controller";
import { PublicBookingRepository } from "./public-booking.repository";
import { PublicBookingService } from "./public-booking.service";

@Module({
  imports: [AvailabilityModule, AppointmentsModule],
  controllers: [PublicBookingController, PublicAppointmentsController],
  providers: [PublicBookingService, PublicBookingRepository],
})
export class PublicBookingModule {}
