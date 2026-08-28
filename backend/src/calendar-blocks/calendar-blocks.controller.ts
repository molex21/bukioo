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
import { CalendarBlocksService } from "./calendar-blocks.service";
import { CreateCalendarBlockDto } from "./dto/create-calendar-block.dto";
import { UpdateCalendarBlockDto } from "./dto/update-calendar-block.dto";
import { ListCalendarBlocksDto } from "./dto/list-calendar-blocks.dto";

@Controller("businesses/:businessId/calendar/blocks")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalendarBlocksController {
  constructor(private readonly calendarBlocksService: CalendarBlocksService) {}
  @Post()
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  create(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() dto: CreateCalendarBlockDto,
    @CurrentUser() userId: string,
  ) {
    return this.calendarBlocksService.create(businessId, dto, userId);
  }
  @Get()
  list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: ListCalendarBlocksDto,
    @CurrentUser() userId: string,
  ) {
    return this.calendarBlocksService.list(businessId, filters, userId);
  }
  @Get("employees/:employeeId")
  listByEmployee(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Query() filters: ListCalendarBlocksDto,
    @CurrentUser() userId: string,
  ) {
    return this.calendarBlocksService.listByEmployee(
      businessId,
      employeeId,
      filters,
      userId,
    );
  }
  @Patch(":blockId")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("blockId", ParseUUIDPipe) blockId: string,
    @Body() dto: UpdateCalendarBlockDto,
    @CurrentUser() userId: string,
  ) {
    return this.calendarBlocksService.update(businessId, blockId, dto, userId);
  }
  @Delete(":blockId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({ resource: "business", source: "params", key: "businessId" })
  async remove(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("blockId", ParseUUIDPipe) blockId: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.calendarBlocksService.remove(businessId, blockId, userId);
  }
}
