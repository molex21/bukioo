import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { SchedulingService } from "./scheduling.service";
import { SchedulingCommandDto, TemplateDto } from "./scheduling.dto";

@Controller("businesses/:businessId/scheduling")
@UseGuards(JwtAuthGuard)
export class SchedulingController {
  constructor(private readonly service: SchedulingService) {}
  @Get("quadrant") quadrant(
    @Param("businessId", ParseUUIDPipe) biz: string,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("employeeId") emp: string | undefined,
    @Query("offset") offset: string | undefined,
    @CurrentUser() actor: string,
  ) {
    return this.service.quadrant(biz, actor, from, to, emp, offset);
  }
  @Get("templates") templates(
    @Param("businessId", ParseUUIDPipe) biz: string,
    @CurrentUser() actor: string,
  ) {
    return this.service.templates(biz, actor);
  }
  @Post("templates") create(
    @Param("businessId", ParseUUIDPipe) biz: string,
    @Body() dto: TemplateDto,
    @CurrentUser() actor: string,
  ) {
    return this.service.saveTemplate(biz, actor, dto);
  }
  @Patch("templates/:id") update(
    @Param("businessId", ParseUUIDPipe) biz: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: TemplateDto,
    @CurrentUser() actor: string,
  ) {
    return this.service.saveTemplate(biz, actor, dto, id);
  }
  @Delete("templates/:id") archive(
    @Param("businessId", ParseUUIDPipe) biz: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SchedulingCommandDto,
    @CurrentUser() actor: string,
  ) {
    return this.service.archiveTemplate(
      biz,
      actor,
      id,
      dto.command.expectedVersion,
    );
  }
  @Post("preview") preview(
    @Param("businessId", ParseUUIDPipe) biz: string,
    @Body() dto: SchedulingCommandDto,
    @CurrentUser() actor: string,
  ) {
    return this.service.change(biz, actor, dto.command, true);
  }
  @Put("changes") change(
    @Param("businessId", ParseUUIDPipe) biz: string,
    @Body() dto: SchedulingCommandDto,
    @CurrentUser() actor: string,
  ) {
    return this.service.change(biz, actor, dto.command, false);
  }
}
