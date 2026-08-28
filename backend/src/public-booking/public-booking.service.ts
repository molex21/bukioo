import { Injectable, NotFoundException } from "@nestjs/common";
import { AvailabilityService } from "../availability/availability.service";
import { ListPublicEmployeesDto } from "./dto/list-public-employees.dto";
import { ListPublicAvailabilityDto } from "./dto/list-public-availability.dto";
import { ListPublicServicesDto } from "./dto/list-public-services.dto";
import { PublicBookingRepository } from "./public-booking.repository";

@Injectable()
export class PublicBookingService {
  constructor(
    private readonly publicBookingRepository: PublicBookingRepository,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async listServices(organizationSlug: string, dto: ListPublicServicesDto) {
    const organization = await this.getActiveOrganization(organizationSlug);

    const services = await this.publicBookingRepository.listActiveServices(
      organization.id,
      dto.businessId,
    );
    return {
      organization: {
        name: organization.name,
        slug: organization.slug,
        timezone: organization.timezone,
      },
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        price: service.price,
        durationMinutes: service.duration_minutes,
        business: {
          id: service.business_id,
          name: service.business_name,
        },
      })),
    };
  }

  async listEmployees(organizationSlug: string, dto: ListPublicEmployeesDto) {
    const organization = await this.getActiveOrganization(organizationSlug);
    const employees = await this.publicBookingRepository.listActiveEmployees(
      organization.id,
      dto.businessId,
      dto.serviceId,
    );
    return {
      employees: employees.map((employee) => ({
        id: employee.id,
        firstName: employee.first_name,
        lastName: employee.last_name,
      })),
    };
  }

  async listAvailability(
    organizationSlug: string,
    dto: ListPublicAvailabilityDto,
  ) {
    const organization = await this.getActiveOrganization(organizationSlug);
    return this.availabilityService.listPublic(
      organization.id,
      dto.businessId,
      {
        employeeId: dto.employeeId,
        serviceId: dto.serviceId,
        from: dto.from,
        to: dto.to,
      },
    );
  }

  private async getActiveOrganization(organizationSlug: string) {
    const organization =
      await this.publicBookingRepository.findActiveOrganization(
        organizationSlug.trim().toLowerCase(),
      );
    if (!organization) {
      throw new NotFoundException("Organizacion no encontrada");
    }
    return organization;
  }
}
