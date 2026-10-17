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
import {
  type ServiceCustomField,
  type ServiceCustomFieldDto,
} from "./dto/service-custom-field.dto";
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
    this.assertLoyaltyConfiguration(dto);
    this.assertPriceConfiguration(dto);
    return this.servicesRepository.create(businessId, {
      ...dto,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      customFields: this.normalizeCustomFields(dto.customFields ?? []),
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
    this.assertLoyaltyConfiguration(dto, service);
    this.assertPriceConfiguration(dto, service);
    const update: UpdateServiceDto = {
      ...dto,
      name: dto.name?.trim(),
      description: dto.description?.trim(),
    };
    if (dto.customFields !== undefined) {
      update.customFields = this.normalizeCustomFields(dto.customFields);
    }
    return this.servicesRepository.update(service, update);
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

  private assertLoyaltyConfiguration(
    dto: Pick<
      CreateServiceDto | UpdateServiceDto,
      | "loyaltyEarningType"
      | "loyaltyFixedPoints"
      | "loyaltyPointsPerCurrencyUnit"
    >,
    current?: ServiceRecord,
  ): void {
    const type = dto.loyaltyEarningType ?? current?.loyalty_earning_type;
    const fixedPoints = dto.loyaltyFixedPoints ?? current?.loyalty_fixed_points;
    const pointsPerCurrencyUnit =
      dto.loyaltyPointsPerCurrencyUnit ??
      (current?.loyalty_points_per_currency_unit === undefined ||
      current.loyalty_points_per_currency_unit === null
        ? null
        : Number(current.loyalty_points_per_currency_unit));

    if (
      (type === "FIXED" || type === "BOTH") &&
      (fixedPoints === null || fixedPoints === undefined)
    ) {
      throw new BadRequestException(
        "Debes indicar puntos fijos para esta regla de fidelizacion",
      );
    }

    if (
      (type === "AMOUNT_MULTIPLIER" || type === "BOTH") &&
      (pointsPerCurrencyUnit === null || pointsPerCurrencyUnit === undefined)
    ) {
      throw new BadRequestException(
        "Debes indicar puntos por unidad monetaria para esta regla de fidelizacion",
      );
    }
  }

  private assertPriceConfiguration(
    dto: Pick<CreateServiceDto | UpdateServiceDto, "price" | "priceType">,
    current?: ServiceRecord,
  ): void {
    const priceType = dto.priceType ?? current?.price_type ?? "FIXED";
    const price =
      dto.price ??
      (current?.price === null || current?.price === undefined
        ? null
        : Number(current.price));

    if (priceType === "FROM" && price === null) {
      throw new BadRequestException(
        "Debes indicar el precio mínimo para un servicio con precio desde",
      );
    }
  }

  private normalizeCustomFields(
    fields: ServiceCustomFieldDto[],
  ): ServiceCustomField[] {
    if (fields.length > 20) {
      throw new BadRequestException("Un servicio puede tener hasta 20 campos");
    }

    const ids = new Set<string>();
    return fields.map((field) => {
      if (ids.has(field.id)) {
        throw new BadRequestException(
          "Los campos configurables no pueden repetirse",
        );
      }
      ids.add(field.id);

      const label = field.label.trim();
      if (!label) {
        throw new BadRequestException("Cada campo debe tener un nombre");
      }

      if (
        field.minValue !== undefined &&
        field.maxValue !== undefined &&
        field.minValue > field.maxValue
      ) {
        throw new BadRequestException(
          "El valor mínimo no puede superar al valor máximo",
        );
      }

      const base: ServiceCustomField = {
        id: field.id,
        label,
        fieldType: field.fieldType,
        required: field.required,
        pricingMode: field.pricingMode,
        durationMode: field.durationMode ?? "NONE",
      };

      if (field.fieldType === "NUMBER") {
        const unitLabel = field.unitLabel?.trim();
        if (unitLabel) base.unitLabel = unitLabel;
        if (field.minValue !== undefined) base.minValue = field.minValue;
        if (field.maxValue !== undefined) base.maxValue = field.maxValue;
      } else if (
        field.unitLabel ||
        field.minValue !== undefined ||
        field.maxValue !== undefined
      ) {
        throw new BadRequestException(
          "La unidad y los límites solo se permiten en campos numéricos",
        );
      }

      if (field.pricingMode === "PER_UNIT") {
        if (field.fieldType !== "NUMBER" || field.unitPrice === undefined) {
          throw new BadRequestException(
            "El precio por unidad requiere un campo numérico y un importe",
          );
        }
        base.unitPrice = field.unitPrice;
      } else if (field.pricingMode === "OPTION") {
        if (field.fieldType !== "SELECT" || !field.options?.length) {
          throw new BadRequestException(
            "El precio por opción requiere un selector con opciones",
          );
        }
      } else if (field.pricingMode !== "NONE") {
        throw new BadRequestException("Regla de precio no válida");
      }

      const durationMode = field.durationMode ?? "NONE";
      if (durationMode === "PER_UNIT") {
        if (
          field.fieldType !== "NUMBER" ||
          field.unitDurationMinutes === undefined
        ) {
          throw new BadRequestException(
            "El tiempo por unidad requiere un campo numérico y minutos",
          );
        }
        base.unitDurationMinutes = field.unitDurationMinutes;
      } else if (durationMode === "OPTION") {
        if (field.fieldType !== "SELECT" || !field.options?.length) {
          throw new BadRequestException(
            "El tiempo por opción requiere un selector con opciones",
          );
        }
      } else if (durationMode !== "NONE") {
        throw new BadRequestException("Regla de tiempo no válida");
      }

      if (field.fieldType === "SELECT") {
        if (!field.options?.length || field.options.length > 50) {
          throw new BadRequestException(
            "Un selector debe tener entre una y 50 opciones",
          );
        }
        const optionValues = new Set<string>();
        base.options = field.options.map((option) => {
          const value = option.value.trim();
          const optionLabel = option.label.trim();
          if (!value || !optionLabel || optionValues.has(value)) {
            throw new BadRequestException(
              "Las opciones deben tener valores únicos y un nombre",
            );
          }
          optionValues.add(value);
          return {
            value,
            label: optionLabel,
            ...(field.pricingMode === "OPTION" &&
            option.priceModifier !== undefined
              ? { priceModifier: option.priceModifier }
              : {}),
            ...(durationMode === "OPTION" &&
            option.durationModifierMinutes !== undefined
              ? { durationModifierMinutes: option.durationModifierMinutes }
              : {}),
          };
        });
      } else if (field.options?.length) {
        throw new BadRequestException(
          "Las opciones solo se permiten en campos de selección",
        );
      }

      return base;
    });
  }
}
