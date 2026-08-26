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
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Controller("businesses/:businessId/customers")
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() dto: CreateCustomerDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customersService.create(businessId, dto, request.userId!);
  }

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customersService.list(businessId, request.userId!);
  }

  @Get(":customerId")
  get(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customersService.get(businessId, customerId, request.userId!);
  }

  @Patch(":customerId")
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Body() dto: UpdateCustomerDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.customersService.update(
      businessId,
      customerId,
      dto,
      request.userId!,
    );
  }

  @Delete(":customerId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.customersService.remove(businessId, customerId, request.userId!);
  }
}
