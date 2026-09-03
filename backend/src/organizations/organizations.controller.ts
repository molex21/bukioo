import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { AuthorizeScope } from "../auth/authorization-scope.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UpdateOrganizationBrandingDto } from "./dto/update-organization-branding.dto";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

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
