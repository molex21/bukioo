import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateLoyaltyLevelDto } from "./dto/create-loyalty-level.dto";
import { UpdateLoyaltyLevelDto } from "./dto/update-loyalty-level.dto";
import { LoyaltyService } from "./loyalty.service";

@Controller("businesses/:businessId/loyalty/levels")
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Post()
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  create(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() dto: CreateLoyaltyLevelDto,
    @CurrentUser() userId: string,
  ) {
    return this.loyaltyService.create(businessId, dto, userId);
  }

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @CurrentUser() userId: string,
  ) {
    return this.loyaltyService.list(businessId, userId);
  }

  @Patch(":levelId")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("levelId", ParseUUIDPipe) levelId: string,
    @Body() dto: UpdateLoyaltyLevelDto,
    @CurrentUser() userId: string,
  ) {
    return this.loyaltyService.update(businessId, levelId, dto, userId);
  }

  @Delete(":levelId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async remove(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("levelId", ParseUUIDPipe) levelId: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.loyaltyService.remove(businessId, levelId, userId);
  }
}
