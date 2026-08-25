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
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from "../auth/jwt-auth.guard";
import { CreateServiceCategoryDto } from "./dto/create-service-category.dto";
import { UpdateServiceCategoryDto } from "./dto/update-service-category.dto";
import { ServiceCategoriesService } from "./service-categories.service";

@Controller("businesses/:businessId/service-categories")
@UseGuards(JwtAuthGuard)
export class ServiceCategoriesController {
  constructor(
    private readonly serviceCategoriesService: ServiceCategoriesService,
  ) {}

  @Post()
  create(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() createDto: CreateServiceCategoryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.serviceCategoriesService.create(
      businessId,
      createDto,
      request.userId!,
    );
  }

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.serviceCategoriesService.list(businessId, request.userId!);
  }

  @Patch(":categoryId")
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Body() updateDto: UpdateServiceCategoryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.serviceCategoriesService.update(
      businessId,
      categoryId,
      updateDto,
      request.userId!,
    );
  }

  @Delete(":categoryId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.serviceCategoriesService.remove(
      businessId,
      categoryId,
      request.userId!,
    );
  }
}
