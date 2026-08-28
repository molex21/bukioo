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
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { BusinessesService } from "./businesses.service";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { ListBusinessesDto } from "./dto/list-businesses.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";

@Controller("businesses")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({
    resource: "organization",
    source: "body",
    key: "organizationId",
  })
  create(
    @Body() createBusinessDto: CreateBusinessDto,
    @CurrentUser() userId: string,
  ) {
    return this.businessesService.create(createBusinessDto, userId);
  }

  @Get()
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({
    resource: "organization",
    source: "query",
    key: "organizationId",
  })
  list(@Query() query: ListBusinessesDto, @CurrentUser() userId: string) {
    return this.businessesService.list(query.organizationId, userId);
  }

  @Get(":businessId")
  get(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @CurrentUser() userId: string,
  ) {
    return this.businessesService.get(businessId, userId);
  }

  @Patch(":businessId")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
    @CurrentUser() userId: string,
  ) {
    return this.businessesService.update(businessId, updateBusinessDto, userId);
  }

  @Delete(":businessId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async remove(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.businessesService.remove(businessId, userId);
  }
}
