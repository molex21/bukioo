import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { type ListAvailabilityDto } from "./dto/list-availability.dto";
import { AvailabilityRepository } from "./availability.repository";

const MAXIMUM_RANGE_DAYS = 31;

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly availabilityRepository: AvailabilityRepository,
  ) {}

  async list(businessId: string, dto: ListAvailabilityDto, userId: string) {
    this.validateRange(dto);

    if (
      !(await this.availabilityRepository.canAccessBusiness(userId, businessId))
    ) {
      throw new ForbiddenException("No tienes acceso a este negocio");
    }

    return this.getAvailability(businessId, dto);
  }

  async listPublic(
    organizationId: string,
    businessId: string,
    dto: ListAvailabilityDto,
  ) {
    this.validateRange(dto);
    return this.getAvailability(businessId, dto, organizationId);
  }

  private async getAvailability(
    businessId: string,
    dto: ListAvailabilityDto,
    organizationId?: string,
  ) {
    const context = await this.availabilityRepository.findContext(
      businessId,
      dto.employeeId,
      dto.serviceId,
    );
    if (
      !context ||
      (context.organization_id !== organizationId && organizationId)
    ) {
      throw new NotFoundException(
        "Empleado o servicio no disponible para este negocio",
      );
    }

    const from = new Date(dto.from);
    const to = new Date(dto.to);
    const slots = await this.availabilityRepository.listSlots(
      context,
      from,
      to,
    );
    return {
      employeeId: context.employee_id,
      serviceId: context.service_id,
      timezone: context.timezone,
      slots,
    };
  }

  private validateRange(dto: ListAvailabilityDto): void {
    const from = new Date(dto.from);
    const to = new Date(dto.to);

    if (from >= to) {
      throw new BadRequestException(
        "La fecha from debe ser anterior a la fecha to",
      );
    }

    if (to.getTime() - from.getTime() > MAXIMUM_RANGE_DAYS * 86_400_000) {
      throw new BadRequestException(
        "El rango maximo de disponibilidad es de 31 dias",
      );
    }
  }
}
