import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateServiceDto } from "./dto/create-service.dto";
import { ReplaceServiceEmployeesDto } from "./dto/replace-service-employees.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { ServicesRepository, type ServiceRecord } from "./services.repository";

@Injectable()
export class ServicesService {
  constructor(private readonly servicesRepository: ServicesRepository) {}

  async create(
    businessId: string,
    dto: CreateServiceDto,
    userId: string,
  ): Promise<ServiceRecord> {
    await this.assertCanManage(userId, businessId);
    await this.assertCategoryBelongsToBusiness(dto.categoryId, businessId);
    return this.servicesRepository.create(businessId, {
      ...dto,
      name: dto.name.trim(),
      description: dto.description?.trim(),
    });
  }

  async list(businessId: string, userId: string): Promise<ServiceRecord[]> {
    await this.assertCanAccess(userId, businessId);
    return this.servicesRepository.listByBusiness(businessId);
  }

  async update(
    businessId: string,
    serviceId: string,
    dto: UpdateServiceDto,
    userId: string,
  ): Promise<ServiceRecord> {
    await this.assertCanManage(userId, businessId);
    const service = await this.getService(businessId, serviceId);
    await this.assertCategoryBelongsToBusiness(dto.categoryId, businessId);
    return this.servicesRepository.update(service, {
      ...dto,
      name: dto.name?.trim(),
      description: dto.description?.trim(),
    });
  }

  async remove(
    businessId: string,
    serviceId: string,
    userId: string,
  ): Promise<void> {
    await this.assertCanManage(userId, businessId);
    const service = await this.getService(businessId, serviceId);
    const references = await this.servicesRepository.countReferences(service);

    if (references > 0) {
      throw new ConflictException(
        "No se puede eliminar un servicio con datos asociados",
      );
    }

    if (!(await this.servicesRepository.remove(service))) {
      throw new NotFoundException("Servicio no encontrado");
    }
  }

  async listEmployees(businessId: string, serviceId: string, userId: string) {
    await this.assertCanAccess(userId, businessId);
    const service = await this.getService(businessId, serviceId);
    return this.servicesRepository.listEmployees(service);
  }

  async replaceEmployees(
    businessId: string,
    serviceId: string,
    dto: ReplaceServiceEmployeesDto,
    userId: string,
  ): Promise<void> {
    await this.assertCanManage(userId, businessId);
    const service = await this.getService(businessId, serviceId);
    const employeeIds = [...new Set(dto.employeeIds)];
    const activeEmployeeIds =
      await this.servicesRepository.findActiveEmployeeIds(
        businessId,
        employeeIds,
      );

    if (activeEmployeeIds.length !== employeeIds.length) {
      throw new BadRequestException(
        "Todos los empleados deben estar activos y pertenecer a este negocio",
      );
    }

    await this.servicesRepository.replaceEmployees(service, employeeIds);
  }

  private async assertCanAccess(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.servicesRepository.canAccessBusiness(userId, businessId))
    ) {
      throw new ForbiddenException("No tienes acceso a este negocio");
    }
  }

  private async assertCanManage(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.servicesRepository.canManageBusiness(userId, businessId))
    ) {
      throw new ForbiddenException(
        "No tienes permiso para gestionar servicios",
      );
    }
  }

  private async assertCategoryBelongsToBusiness(
    categoryId: string | undefined,
    businessId: string,
  ): Promise<void> {
    if (
      categoryId &&
      !(await this.servicesRepository.categoryBelongsToBusiness(
        categoryId,
        businessId,
      ))
    ) {
      throw new BadRequestException("La categoria no pertenece a este negocio");
    }
  }

  private async getService(
    businessId: string,
    serviceId: string,
  ): Promise<ServiceRecord> {
    const service = await this.servicesRepository.findById(
      businessId,
      serviceId,
    );
    if (!service) {
      throw new NotFoundException("Servicio no encontrado");
    }
    return service;
  }
}
