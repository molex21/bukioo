import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AvailabilityService } from "./availability.service";
import { ListAvailabilityDto } from "./dto/list-availability.dto";

@Controller("businesses/:businessId/availability")
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() dto: ListAvailabilityDto,
    @CurrentUser() userId: string,
  ) {
    return this.availabilityService.list(businessId, dto, userId);
  }
}
