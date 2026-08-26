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
import { CalendarBlocksService } from "./calendar-blocks.service";
import { CreateCalendarBlockDto } from "./dto/create-calendar-block.dto";
import { UpdateCalendarBlockDto } from "./dto/update-calendar-block.dto";
import { ListCalendarBlocksDto } from "./dto/list-calendar-blocks.dto";

@Controller("businesses/:businessId/calendar/blocks")
@UseGuards(JwtAuthGuard)
export class CalendarBlocksController {
  constructor(private readonly calendarBlocksService: CalendarBlocksService) {}
  @Post() create(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() dto: CreateCalendarBlockDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.calendarBlocksService.create(businessId, dto, request.userId!);
  }
  @Get() list(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: ListCalendarBlocksDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.calendarBlocksService.list(
      businessId,
      filters,
      request.userId!,
    );
  }
  @Get("employees/:employeeId") listByEmployee(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Query() filters: ListCalendarBlocksDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.calendarBlocksService.listByEmployee(
      businessId,
      employeeId,
      filters,
      request.userId!,
    );
  }
  @Patch(":blockId") update(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("blockId", ParseUUIDPipe) blockId: string,
    @Body() dto: UpdateCalendarBlockDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.calendarBlocksService.update(
      businessId,
      blockId,
      dto,
      request.userId!,
    );
  }
  @Delete(":blockId") @HttpCode(HttpStatus.NO_CONTENT) async remove(
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Param("blockId", ParseUUIDPipe) blockId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.calendarBlocksService.remove(
      businessId,
      blockId,
      request.userId!,
    );
  }
}
