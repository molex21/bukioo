import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateSuperadminBusinessDto } from "./dto/create-superadmin-business.dto";
import { CreateSuperadminEmployeeDto } from "./dto/create-superadmin-employee.dto";
import { CreateSuperadminOrganizationDto } from "./dto/create-superadmin-organization.dto";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { ListSuperadminBusinessesDto } from "./dto/list-superadmin-businesses.dto";
import { ListSuperadminEmployeesDto } from "./dto/list-superadmin-employees.dto";
import { ListSuperadminOrganizationsDto } from "./dto/list-superadmin-organizations.dto";
import { SetOrganizationSubscriptionDto } from "./dto/set-organization-subscription.dto";
import { UpdateOrganizationSecurityDto } from "./dto/update-organization-security.dto";
import { UpdateOrganizationStatusDto } from "./dto/update-organization-status.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { UpdateSuperadminBusinessDto } from "./dto/update-superadmin-business.dto";
import { ListPlatformAuditLogsDto } from "./dto/list-platform-audit-logs.dto";
import { ListOrganizationSubscriptionsDto } from "./dto/list-organization-subscriptions.dto";
import { SuperadminGuard } from "./superadmin.guard";
import { SuperadminService } from "./superadmin.service";
import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";
import { OrganizationMembersService } from "../organizations/organization-members.service";
import { ListOrganizationMembersDto } from "../organizations/dto/list-organization-members.dto";
import { UpdateMemberRoleDto } from "../organizations/dto/update-member-role.dto";
import {
  UpdateMemberBusinessesDto,
  UpdateMemberStatusDto,
} from "../organizations/dto/update-member-access.dto";
import { RequestEmailChangeDto } from "../auth/dto/request-email-change.dto";
import { ConfirmEmailChangeDto } from "../auth/dto/confirm-email-change.dto";

@Controller("superadmin")
@UseGuards(JwtAuthGuard, SuperadminGuard)
export class SuperadminController {
  constructor(
    private readonly service: SuperadminService,
    private readonly members: OrganizationMembersService,
  ) {}

  @Get("organizations/:organizationId/members")
  listMembers(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Query() filters: ListOrganizationMembersDto,
    @CurrentUser() userId: string,
  ) {
    return this.members.list(organizationId, filters, userId, true);
  }

  @Post("organizations/:organizationId/transfer-ownership")
  @HttpCode(200)
  transferOwnership(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() input: TransferOwnershipDto,
    @CurrentUser() userId: string,
  ) {
    return this.members.transferOwnership(organizationId, input, userId);
  }

  @Patch("organizations/:organizationId/members/:membershipId/status")
  updateMemberStatus(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("membershipId", ParseUUIDPipe) membershipId: string,
    @Body() input: UpdateMemberStatusDto,
    @CurrentUser() userId: string,
  ) {
    return this.members.updateStatus(
      organizationId,
      membershipId,
      input,
      userId,
      true,
    );
  }

  @Patch("organizations/:organizationId/members/:membershipId/businesses")
  updateMemberBusinesses(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("membershipId", ParseUUIDPipe) membershipId: string,
    @Body() input: UpdateMemberBusinessesDto,
    @CurrentUser() userId: string,
  ) {
    return this.members.updateBusinesses(
      organizationId,
      membershipId,
      input,
      userId,
      true,
    );
  }

  @Patch("organizations/:organizationId/members/:membershipId/role")
  updateMemberRole(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("membershipId", ParseUUIDPipe) membershipId: string,
    @Body() input: UpdateMemberRoleDto,
    @CurrentUser() userId: string,
  ) {
    return this.members.updateRole(
      organizationId,
      membershipId,
      input,
      userId,
      true,
    );
  }

  @Post(
    "organizations/:organizationId/members/:membershipId/email-change/request",
  )
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  requestMemberEmailChange(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("membershipId", ParseUUIDPipe) membershipId: string,
    @Body() input: RequestEmailChangeDto,
    @CurrentUser() userId: string,
    @Headers("user-agent") userAgent: string | undefined,
    @Ip() ipAddress: string,
  ) {
    return this.service.requestMemberEmailChange(
      organizationId,
      membershipId,
      input,
      userId,
      { userAgent, ipAddress },
    );
  }

  @Post(
    "organizations/:organizationId/members/:membershipId/email-change/confirm",
  )
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  confirmMemberEmailChange(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("membershipId", ParseUUIDPipe) membershipId: string,
    @Body() input: ConfirmEmailChangeDto,
    @CurrentUser() userId: string,
    @Headers("user-agent") userAgent: string | undefined,
    @Ip() ipAddress: string,
  ) {
    return this.service.confirmMemberEmailChange(
      organizationId,
      membershipId,
      input,
      userId,
      { userAgent, ipAddress },
    );
  }

  @Get("dashboard") dashboard() {
    return this.service.dashboard();
  }
  @Get("organizations") listOrganizations(
    @Query() filters: ListSuperadminOrganizationsDto,
  ) {
    return this.service.listOrganizations(filters);
  }
  @Post("organizations") createOrganization(
    @Body() body: CreateSuperadminOrganizationDto,
    @CurrentUser() userId: string,
  ) {
    return this.service.createOrganization(body, userId);
  }
  @Get("organizations/:organizationId") getOrganization(
    @Param("organizationId", ParseUUIDPipe) id: string,
  ) {
    return this.service.getOrganization(id);
  }
  @Get("organizations/:organizationId/businesses") listOrganizationBusinesses(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Query() filters: ListSuperadminBusinessesDto,
  ) {
    return this.service.listOrganizationBusinesses(organizationId, filters);
  }
  @Post("organizations/:organizationId/businesses") createOrganizationBusiness(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() body: CreateSuperadminBusinessDto,
    @CurrentUser() userId: string,
  ) {
    return this.service.createOrganizationBusiness(
      organizationId,
      body,
      userId,
    );
  }
  @Get("organizations/:organizationId/businesses/:businessId")
  getOrganizationBusiness(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("businessId", ParseUUIDPipe) businessId: string,
  ) {
    return this.service.getOrganizationBusiness(organizationId, businessId);
  }
  @Patch("organizations/:organizationId/businesses/:businessId")
  updateOrganizationBusiness(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() body: UpdateSuperadminBusinessDto,
    @CurrentUser() userId: string,
  ) {
    return this.service.updateOrganizationBusiness(
      organizationId,
      businessId,
      body,
      userId,
    );
  }
  @Get("organizations/:organizationId/businesses/:businessId/employees")
  listBusinessEmployees(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Query() filters: ListSuperadminEmployeesDto,
  ) {
    return this.service.listBusinessEmployees(
      organizationId,
      businessId,
      filters,
    );
  }
  @Post("organizations/:organizationId/businesses/:businessId/employees")
  createBusinessEmployee(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("businessId", ParseUUIDPipe) businessId: string,
    @Body() body: CreateSuperadminEmployeeDto,
    @CurrentUser() userId: string,
  ) {
    return this.service.createBusinessEmployee(
      organizationId,
      businessId,
      body,
      userId,
    );
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
  @Get("organizations/:organizationId/subscriptions")
  listSubscriptions(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Query() filters: ListOrganizationSubscriptionsDto,
  ) {
    return this.service.listSubscriptions(organizationId, filters);
  }
  @Get("audit-logs")
  listAuditLogs(@Query() filters: ListPlatformAuditLogsDto) {
    return this.service.listAuditLogs(filters);
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
