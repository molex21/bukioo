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
import { CreateServiceCategoryDto } from "./dto/create-service-category.dto";
import { UpdateServiceCategoryDto } from "./dto/update-service-category.dto";
import { ServiceCategoriesService } from "./service-categories.service";

@Controller("businesses/:businessId/service-categories")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceCategoriesController {
  constructor(
    private readonly serviceCategoriesService: ServiceCategoriesService,
  ) {}

  @Post()
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  create(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() createDto: CreateServiceCategoryDto,
    @CurrentUser() userId: string,
  ) {
    return this.serviceCategoriesService.create(businessId, createDto, userId);
  }

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @CurrentUser() userId: string,
  ) {
    return this.serviceCategoriesService.list(businessId, userId);
  }

  @Patch(":categoryId")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Body() updateDto: UpdateServiceCategoryDto,
    @CurrentUser() userId: string,
  ) {
    return this.serviceCategoriesService.update(
      businessId,
      categoryId,
      updateDto,
      userId,
    );
  }

  @Delete(":categoryId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async remove(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.serviceCategoriesService.remove(businessId, categoryId, userId);
  }
}
