import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ServiceCategoriesRepository,
  type ServiceCategoryRecord,
} from "./service-categories.repository";
import { CreateServiceCategoryDto } from "./dto/create-service-category.dto";
import { UpdateServiceCategoryDto } from "./dto/update-service-category.dto";

@Injectable()
export class ServiceCategoriesService {
  constructor(
    private readonly serviceCategoriesRepository: ServiceCategoriesRepository,
  ) {}

  async create(
    businessId: string,
    createDto: CreateServiceCategoryDto,
    userId: string,
  ): Promise<ServiceCategoryRecord> {
    await this.assertCanManageBusiness(userId, businessId);
    return this.serviceCategoriesRepository.create(businessId, {
      ...createDto,
      name: createDto.name.trim(),
    });
  }

  async list(
    businessId: string,
    userId: string,
  ): Promise<ServiceCategoryRecord[]> {
    await this.assertCanAccessBusiness(userId, businessId);
    return this.serviceCategoriesRepository.listByBusiness(businessId);
  }

  async update(
    businessId: string,
    categoryId: string,
    updateDto: UpdateServiceCategoryDto,
    userId: string,
  ): Promise<ServiceCategoryRecord> {
    await this.assertCanManageBusiness(userId, businessId);
    const category = await this.getCategory(businessId, categoryId);
    return this.serviceCategoriesRepository.update(category, {
      ...updateDto,
      name: updateDto.name?.trim(),
    });
  }

  async remove(
    businessId: string,
    categoryId: string,
    userId: string,
  ): Promise<void> {
    await this.assertCanManageBusiness(userId, businessId);
    const category = await this.getCategory(businessId, categoryId);
    const servicesCount =
      await this.serviceCategoriesRepository.countServices(category);

    if (servicesCount > 0) {
      throw new ConflictException(
        "No se puede eliminar una categoria con servicios asociados",
      );
    }

    const deleted = await this.serviceCategoriesRepository.remove(category);

    if (!deleted) {
      throw new NotFoundException("Categoria no encontrada");
    }
  }

  private async assertCanAccessBusiness(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.serviceCategoriesRepository.canAccessBusiness(
        userId,
        businessId,
      ))
    ) {
      throw new ForbiddenException("No tienes acceso a este negocio");
    }
  }

  private async assertCanManageBusiness(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.serviceCategoriesRepository.canManageBusiness(
        userId,
        businessId,
      ))
    ) {
      throw new ForbiddenException(
        "No tienes permiso para gestionar categorias",
      );
    }
  }

  private async getCategory(
    businessId: string,
    categoryId: string,
  ): Promise<ServiceCategoryRecord> {
    const category = await this.serviceCategoriesRepository.findById(
      businessId,
      categoryId,
    );

    if (!category) {
      throw new NotFoundException("Categoria no encontrada");
    }

    return category;
  }
}
