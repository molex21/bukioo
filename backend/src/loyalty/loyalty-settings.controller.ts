import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UpdateLoyaltySettingsDto } from "./dto/update-loyalty-settings.dto";
import { LoyaltyService } from "./loyalty.service";

@Controller("businesses/:businessId/loyalty/settings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltySettingsController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get()
  get(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @CurrentUser() userId: string,
  ) {
    return this.loyaltyService.getSettings(businessId, userId);
  }

  @Patch()
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() dto: UpdateLoyaltySettingsDto,
    @CurrentUser() userId: string,
  ) {
    return this.loyaltyService.updateSettings(businessId, dto, userId);
  }
}
