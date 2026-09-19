import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UpdateOrganizationBrandingDto } from "./dto/update-organization-branding.dto";
import { OrganizationsService } from "./organizations.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { OrganizationMembersService } from "./organization-members.service";
import { ListOrganizationMembersDto } from "./dto/list-organization-members.dto";
import { UpdateMemberRoleDto } from "./dto/update-member-role.dto";
import {
  UpdateMemberBusinessesDto,
  UpdateMemberStatusDto,
} from "./dto/update-member-access.dto";

@Controller("organizations")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly members: OrganizationMembersService,
  ) {}

  @Get(":organizationId/members")
  listMembers(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Query() filters: ListOrganizationMembersDto,
    @CurrentUser() userId: string,
  ) {
    return this.members.list(organizationId, filters, userId);
  }

  @Patch(":organizationId/members/:membershipId/status")
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
    );
  }

  @Patch(":organizationId/members/:membershipId/businesses")
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
    );
  }

  @Patch(":organizationId/members/:membershipId/role")
  updateMemberRole(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("membershipId", ParseUUIDPipe) membershipId: string,
    @Body() input: UpdateMemberRoleDto,
    @CurrentUser() userId: string,
  ) {
    return this.members.updateRole(organizationId, membershipId, input, userId);
  }

  @Patch(":organizationId/branding")
  @Roles("OWNER", "ADMIN")
  @AuthorizeScope({
    resource: "organization",
    source: "params",
    key: "organizationId",
  })
  updateBranding(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() updateDto: UpdateOrganizationBrandingDto,
  ) {
    return this.organizationsService.updateBranding(organizationId, updateDto);
  }
}
