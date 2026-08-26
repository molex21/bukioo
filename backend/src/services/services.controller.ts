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
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from "../auth/jwt-auth.guard";
import { CreateServiceDto } from "./dto/create-service.dto";
import { ReplaceServiceEmployeesDto } from "./dto/replace-service-employees.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { ServicesService } from "./services.service";

@Controller("businesses/:businessId/services")
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  create(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() dto: CreateServiceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.servicesService.create(businessId, dto, request.userId!);
  }

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.servicesService.list(businessId, request.userId!);
  }

  @Get(":serviceId/employees")
  listEmployees(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.servicesService.listEmployees(
      businessId,
      serviceId,
      request.userId!,
    );
  }

  @Put(":serviceId/employees")
  @HttpCode(HttpStatus.NO_CONTENT)
  async replaceEmployees(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Body() dto: ReplaceServiceEmployeesDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.servicesService.replaceEmployees(
      businessId,
      serviceId,
      dto,
      request.userId!,
    );
  }

  @Patch(":serviceId")
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateServiceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.servicesService.update(
      businessId,
      serviceId,
      dto,
      request.userId!,
    );
  }

  @Delete(":serviceId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("serviceId", ParseUUIDPipe) serviceId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.servicesService.remove(businessId, serviceId, request.userId!);
  }
}
