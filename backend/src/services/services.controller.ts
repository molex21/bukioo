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
  Put,
  UseGuards,
} from "@nestjs/common";
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateServiceDto } from "./dto/create-service.dto";
import { ReplaceServiceEmployeesDto } from "./dto/replace-service-employees.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { ServicesService } from "./services.service";

@Controller("businesses/:businessId/services")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  create(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() dto: CreateServiceDto,
    @CurrentUser() userId: string,
  ) {
    return this.servicesService.create(businessId, dto, userId);
  }

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @CurrentUser() userId: string,
  ) {
    return this.servicesService.list(businessId, userId);
  }

  @Get(":serviceId/employees")
  listEmployees(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @CurrentUser() userId: string,
  ) {
    return this.servicesService.listEmployees(businessId, serviceId, userId);
  }

  @Put(":serviceId/employees")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async replaceEmployees(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Body() dto: ReplaceServiceEmployeesDto,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.servicesService.replaceEmployees(
      businessId,
      serviceId,
      dto,
      userId,
    );
  }

  @Patch(":serviceId")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() userId: string,
  ) {
    return this.servicesService.update(businessId, serviceId, dto, userId);
  }

  @Delete(":serviceId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async remove(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.servicesService.remove(businessId, serviceId, userId);
  }
}
