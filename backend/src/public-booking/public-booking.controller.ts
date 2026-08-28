import { Controller, Get, Param, Query } from "@nestjs/common";
import { ListPublicEmployeesDto } from "./dto/list-public-employees.dto";
import { ListPublicAvailabilityDto } from "./dto/list-public-availability.dto";
import { ListPublicServicesDto } from "./dto/list-public-services.dto";
import { PublicBookingService } from "./public-booking.service";

@Controller("public/:organizationSlug")
export class PublicBookingController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  @Get("services")
  listServices(
    @Param("organizationSlug") organizationSlug: string,
    @Query() dto: ListPublicServicesDto,
  ) {
    return this.publicBookingService.listServices(organizationSlug, dto);
  }

  @Get("employees")
  listEmployees(
    @Param("organizationSlug") organizationSlug: string,
    @Query() dto: ListPublicEmployeesDto,
  ) {
    return this.publicBookingService.listEmployees(organizationSlug, dto);
  }

  @Get("availability")
  listAvailability(
    @Param("organizationSlug") organizationSlug: string,
    @Query() dto: ListPublicAvailabilityDto,
  ) {
    return this.publicBookingService.listAvailability(organizationSlug, dto);
  }
}
