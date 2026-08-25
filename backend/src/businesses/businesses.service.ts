import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  BusinessesRepository,
  type BusinessRecord,
} from "./businesses.repository";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { UpdateBusinessDto } from "./dto/update-business.dto";

@Injectable()
export class BusinessesService {
  constructor(private readonly businessesRepository: BusinessesRepository) {}

  async create(createBusinessDto: CreateBusinessDto, userId: string) {
    await this.assertCanManageOrganization(
      userId,
      createBusinessDto.organizationId,
    );

    try {
      return await this.businessesRepository.create(
        {
          ...createBusinessDto,
          name: createBusinessDto.name.trim(),
          slug: createBusinessDto.slug.trim().toLowerCase(),
          email: createBusinessDto.email?.trim().toLowerCase(),
          phone: createBusinessDto.phone?.trim(),
          timezone: createBusinessDto.timezone?.trim(),
        },
        userId,
      );
    } catch (error: unknown) {
      if (this.isDuplicateError(error)) {
        throw new ConflictException(
          "Ya existe un negocio con ese slug en la organización",
        );
      }

      throw error;
    }
  }

  async list(organizationId: string, userId: string) {
    await this.assertCanManageOrganization(userId, organizationId);
    return this.businessesRepository.listByOrganization(organizationId);
  }

  async get(businessId: string, userId: string): Promise<BusinessRecord> {
    const business = await this.businessesRepository.findAccessibleById(
      businessId,
      userId,
    );

    if (!business) {
      throw new ForbiddenException("No tienes acceso a este negocio");
    }

    return business;
  }

  async update(
    businessId: string,
    updateBusinessDto: UpdateBusinessDto,
    userId: string,
  ) {
    const business = await this.getManagedBusiness(businessId, userId);

    try {
      return await this.businessesRepository.update(
        business,
        updateBusinessDto,
      );
    } catch (error: unknown) {
      if (this.isDuplicateError(error)) {
        throw new ConflictException(
          "Ya existe un negocio con ese slug en la organización",
        );
      }

      throw error;
    }
  }

  async remove(businessId: string, userId: string): Promise<void> {
    const business = await this.getManagedBusiness(businessId, userId);
    const businessCount = await this.businessesRepository.countByOrganization(
      business.organization_id,
    );

    if (businessCount <= 1) {
      throw new ConflictException(
        "La organización debe conservar al menos un negocio",
      );
    }

    try {
      const deleted = await this.businessesRepository.remove(business);

      if (!deleted) {
        throw new ForbiddenException("No tienes acceso a este negocio");
      }
    } catch (error: unknown) {
      if (this.isForeignKeyError(error)) {
        throw new ConflictException(
          "No se puede eliminar un negocio con datos asociados; suspéndelo en su lugar",
        );
      }

      throw error;
    }
  }

  private async assertCanManageOrganization(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const canManage = await this.businessesRepository.canManageOrganization(
      userId,
      organizationId,
    );

    if (!canManage) {
      throw new ForbiddenException("No tienes permiso para gestionar negocios");
    }
  }

  private async getManagedBusiness(
    businessId: string,
    userId: string,
  ): Promise<BusinessRecord> {
    const business = await this.businessesRepository.findManagedById(
      businessId,
      userId,
    );

    if (!business) {
      throw new ForbiddenException("No tienes acceso a este negocio");
    }

    return business;
  }

  private isDuplicateError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    );
  }

  private isForeignKeyError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23503"
    );
  }
}
