import { Injectable, NotFoundException } from "@nestjs/common";
import { AvailabilityService } from "../availability/availability.service";
import { AppointmentsService } from "../appointments/appointments.service";
import { createHash, randomBytes } from "crypto";
import { CreatePublicAppointmentDto } from "./dto/create-public-appointment.dto";
import { ListPublicEmployeesDto } from "./dto/list-public-employees.dto";
import { ListPublicAvailabilityDto } from "./dto/list-public-availability.dto";
import { ListPublicServicesDto } from "./dto/list-public-services.dto";
import { PublicBookingRepository } from "./public-booking.repository";

@Injectable()
export class PublicBookingService {
  constructor(
    private readonly publicBookingRepository: PublicBookingRepository,
    private readonly availabilityService: AvailabilityService,
    private readonly appointmentsService: AppointmentsService,
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

  async createAppointment(
    organizationSlug: string,
    dto: CreatePublicAppointmentDto,
  ) {
    const organization = await this.getActiveOrganization(organizationSlug);
    const customer = await this.publicBookingRepository.findOrCreateCustomer({
      organizationId: organization.id,
      businessId: dto.businessId,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName?.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone.trim(),
    });
    if (!customer) throw new NotFoundException("Negocio no encontrado");
    const appointment = await this.appointmentsService.createPublic(
      dto.businessId,
      {
        customerId: customer.id,
        employeeId: dto.employeeId,
        serviceId: dto.serviceId,
        startAt: dto.startAt,
        customerNotes: dto.customerNotes?.trim(),
      },
    );
    const token = randomBytes(32).toString("base64url");
    await this.publicBookingRepository.createAppointmentAccessToken(
      appointment.id,
      createHash("sha256").update(token).digest("hex"),
    );
    return {
      appointment: {
        id: appointment.id,
        referenceCode: appointment.reference_code,
        status: appointment.status,
        startAt: appointment.start_at,
        endAt: appointment.end_at,
      },
      accessToken: token,
    };
  }

  async getAppointment(token: string) {
    const appointment =
      await this.publicBookingRepository.findAppointmentByAccessToken(
        createHash("sha256").update(token).digest("hex"),
      );
    if (!appointment) throw new NotFoundException("Cita no encontrada");
    return {
      id: appointment.id,
      referenceCode: appointment.reference_code,
      status: appointment.status,
      startAt: appointment.start_at,
      endAt: appointment.end_at,
    };
  }

  async cancelAppointment(token: string) {
    const hash = createHash("sha256").update(token).digest("hex");
    if (
      !(await this.publicBookingRepository.cancelAppointmentByAccessToken(hash))
    )
      throw new NotFoundException("Cita no encontrada");
    return { status: "CANCELLED" };
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
