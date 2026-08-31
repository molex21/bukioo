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
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { ListSuperadminOrganizationsDto } from "./dto/list-superadmin-organizations.dto";
import { SetOrganizationSubscriptionDto } from "./dto/set-organization-subscription.dto";
import { UpdateOrganizationSecurityDto } from "./dto/update-organization-security.dto";
import { UpdateOrganizationStatusDto } from "./dto/update-organization-status.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { SuperadminGuard } from "./superadmin.guard";
import { SuperadminService } from "./superadmin.service";

@Controller("superadmin")
@UseGuards(JwtAuthGuard, SuperadminGuard)
export class SuperadminController {
  constructor(private readonly service: SuperadminService) {}

  @Get("dashboard") dashboard() {
    return this.service.dashboard();
  }
  @Get("organizations") listOrganizations(
    @Query() filters: ListSuperadminOrganizationsDto,
  ) {
    return this.service.listOrganizations(filters);
  }
  @Get("organizations/:organizationId") getOrganization(
    @Param("organizationId", ParseUUIDPipe) id: string,
  ) {
    return this.service.getOrganization(id);
  }
  @Patch("organizations/:organizationId/status") updateStatus(
    @Param("organizationId", ParseUUIDPipe) id: string,
    @Body() body: UpdateOrganizationStatusDto,
    @CurrentUser() userId: string,
  ) {
    return this.service.updateOrganizationStatus(id, body.status, userId);
  }
  @Patch("organizations/:organizationId/security") updateSecurity(
    @Param("organizationId", ParseUUIDPipe) id: string,
    @Body() body: UpdateOrganizationSecurityDto,
    @CurrentUser() userId: string,
  ) {
    return this.service.updateOrganizationSecurity(
      id,
      body.require2faForAdmins,
      userId,
    );
  }
  @Put("organizations/:organizationId/subscription") setSubscription(
    @Param("organizationId", ParseUUIDPipe) id: string,
    @Body() body: SetOrganizationSubscriptionDto,
    @CurrentUser() userId: string,
  ) {
    return this.service.setSubscription(id, body, userId);
  }
  @Get("plans") listPlans() {
    return this.service.listPlans();
  }
  @Post("plans") createPlan(
    @Body() body: CreatePlanDto,
    @CurrentUser() userId: string,
  ) {
    return this.service.createPlan(body, userId);
  }
  @Patch("plans/:planCode") updatePlan(
    @Param("planCode") code: string,
    @Body() body: UpdatePlanDto,
    @CurrentUser() userId: string,
  ) {
    return this.service.updatePlan(code, body, userId);
  }
  @Delete("plans/:planCode") async removePlan(
    @Param("planCode") code: string,
    @CurrentUser() userId: string,
  ) {
    await this.service.removePlan(code, userId);
  }
}
