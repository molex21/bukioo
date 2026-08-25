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
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from "../auth/jwt-auth.guard";
import { BusinessesService } from "./businesses.service";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { ListBusinessesDto } from "./dto/list-businesses.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";

@Controller("businesses")
@UseGuards(JwtAuthGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  create(
    @Body() createBusinessDto: CreateBusinessDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.businessesService.create(createBusinessDto, request.userId!);
  }

  @Get()
  list(
    @Query() query: ListBusinessesDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.businessesService.list(query.organizationId, request.userId!);
  }

  @Get(":businessId")
  get(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.businessesService.get(businessId, request.userId!);
  }

  @Patch(":businessId")
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.businessesService.update(
      businessId,
      updateBusinessDto,
      request.userId!,
    );
  }

  @Delete(":businessId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.businessesService.remove(businessId, request.userId!);
  }
}
