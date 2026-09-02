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
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { ListCustomersDto } from "./dto/list-customers.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Controller("businesses/:businessId/customers")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  create(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() dto: CreateCustomerDto,
    @CurrentUser() userId: string,
  ) {
    return this.customersService.create(businessId, dto, userId);
  }

  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: ListCustomersDto,
    @CurrentUser() userId: string,
  ) {
    return this.customersService.list(businessId, filters, userId);
  }

  @Get(":customerId")
  get(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @CurrentUser() userId: string,
  ) {
    return this.customersService.get(businessId, customerId, userId);
  }

  @Patch(":customerId")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() userId: string,
  ) {
    return this.customersService.update(businessId, customerId, dto, userId);
  }

  @Delete(":customerId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async remove(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.customersService.remove(businessId, customerId, userId);
  }
}
