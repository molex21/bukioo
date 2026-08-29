import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdjustLoyaltyDto } from "../customers/dto/adjust-loyalty.dto";
import { LoyaltyService } from "./loyalty.service";

@Controller("businesses/:businessId/customers/:customerId/loyalty")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerLoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get()
  get(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @CurrentUser() userId: string,
  ) {
    return this.loyaltyService.getCustomerLoyalty(
      businessId,
      customerId,
      userId,
    );
  }

  @Post("adjust")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async adjust(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Body() dto: AdjustLoyaltyDto,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.loyaltyService.adjustCustomerPoints(
      businessId,
      customerId,
      dto.points,
      dto.reason,
      userId,
    );
  }
}
