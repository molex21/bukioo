import { Controller, Get, Param, Post } from "@nestjs/common";
import { PublicBookingService } from "./public-booking.service";
@Controller("public/appointments")
export class PublicAppointmentsController {
  constructor(private readonly service: PublicBookingService) {}
  @Get(":accessToken") get(@Param("accessToken") token: string) {
    return this.service.getAppointment(token);
  }
  @Post(":accessToken/cancel")
  cancel(@Param("accessToken") token: string) {
    return this.service.cancelAppointment(token);
  }
}
