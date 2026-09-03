import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UpdateOrganizationBrandingDto } from "./dto/update-organization-branding.dto";
import { OrganizationsRepository } from "./organizations.repository";

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async updateBranding(
    organizationId: string,
    updateDto: UpdateOrganizationBrandingDto,
  ) {
    if (!Object.prototype.hasOwnProperty.call(updateDto, "logoUrl")) {
      throw new BadRequestException("logoUrl es obligatorio");
    }

    const organization = await this.organizationsRepository.updateBranding(
      organizationId,
      updateDto.logoUrl,
    );

    if (!organization) {
      throw new NotFoundException("Organizacion no encontrada");
    }

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logoUrl: organization.logo_url,
      primaryColor: organization.primary_color,
      updatedAt: organization.updated_at,
    };
  }
}
