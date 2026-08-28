import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { TwoFactorRepository } from "../auth/two-factor.repository";
import {
  EmployeesRepository,
  type EmployeeRecord,
} from "./employees.repository";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly authService: AuthService,
    private readonly twoFactorRepository: TwoFactorRepository,
  ) {}

  async create(
    businessId: string,
    createEmployeeDto: CreateEmployeeDto,
    userId: string,
  ): Promise<EmployeeRecord> {
    await this.assertCanManageBusiness(userId, businessId);
    const employeeDto = this.normalize(createEmployeeDto);

    if (!employeeDto.inviteUser) {
      return this.employeesRepository.create(businessId, employeeDto);
    }

    if (!employeeDto.email) {
      throw new BadRequestException(
        "El email es obligatorio para invitar al empleado",
      );
    }

    const organizationId =
      await this.employeesRepository.findActiveBusinessOrganizationId(
        businessId,
      );

    if (!organizationId) {
      throw new NotFoundException("Negocio no encontrado");
    }

    return this.authService.inviteEmployee({
      organizationId,
      businessId,
      firstName: employeeDto.firstName,
      lastName: employeeDto.lastName,
      email: employeeDto.email,
      phone: employeeDto.phone,
      color: employeeDto.color,
      notes: employeeDto.notes,
    });
  }

  async list(businessId: string, userId: string): Promise<EmployeeRecord[]> {
    await this.assertCanAccessBusiness(userId, businessId);
    return this.employeesRepository.listByBusiness(businessId);
  }

  async invite(
    businessId: string,
    employeeId: string,
    userId: string,
  ): Promise<EmployeeRecord> {
    await this.assertCanManageBusiness(userId, businessId);
    const employee = await this.getActiveEmployee(businessId, employeeId);

    if (employee.user_id) {
      throw new BadRequestException("El empleado ya tiene una cuenta asociada");
    }

    if (!employee.email) {
      throw new BadRequestException(
        "El empleado necesita un email para recibir la invitacion",
      );
    }

    return this.authService.inviteExistingEmployee({
      email: employee.email,
      organizationId: employee.organization_id,
      businessId: employee.business_id,
      employeeId: employee.id,
    });
  }

  async get(
    businessId: string,
    employeeId: string,
    userId: string,
  ): Promise<EmployeeRecord> {
    await this.assertCanAccessBusiness(userId, businessId);
    return this.getActiveEmployee(businessId, employeeId);
  }

  async update(
    businessId: string,
    employeeId: string,
    updateEmployeeDto: UpdateEmployeeDto,
    userId: string,
  ): Promise<EmployeeRecord> {
    await this.assertCanManageBusiness(userId, businessId);
    const employee = await this.getActiveEmployee(businessId, employeeId);
    return this.employeesRepository.update(
      employee,
      this.normalize(updateEmployeeDto),
    );
  }

  async resetTwoFactor(
    businessId: string,
    employeeId: string,
    userId: string,
  ): Promise<void> {
    await this.assertCanManageBusiness(userId, businessId);
    const employee = await this.getActiveEmployee(businessId, employeeId);

    if (!employee.user_id) {
      throw new BadRequestException("El empleado no tiene una cuenta asociada");
    }

    const reset = await this.twoFactorRepository.reset(employee.user_id);

    if (!reset) {
      throw new NotFoundException("El empleado no tiene 2FA activo");
    }
  }

  async remove(
    businessId: string,
    employeeId: string,
    userId: string,
  ): Promise<void> {
    await this.assertCanManageBusiness(userId, businessId);
    const employee = await this.getActiveEmployee(businessId, employeeId);
    const archived = await this.employeesRepository.archive(employee);

    if (!archived) {
      throw new NotFoundException("Empleado no encontrado");
    }
  }

  private async assertCanAccessBusiness(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.employeesRepository.canAccessBusiness(userId, businessId))
    ) {
      throw new ForbiddenException("No tienes acceso a este negocio");
    }
  }

  private async assertCanManageBusiness(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.employeesRepository.canManageBusiness(userId, businessId))
    ) {
      throw new ForbiddenException(
        "No tienes permiso para gestionar empleados",
      );
    }
  }

  private async getActiveEmployee(
    businessId: string,
    employeeId: string,
  ): Promise<EmployeeRecord> {
    const employee = await this.employeesRepository.findActiveById(
      businessId,
      employeeId,
    );

    if (!employee) {
      throw new NotFoundException("Empleado no encontrado");
    }

    return employee;
  }

  private normalize<T extends CreateEmployeeDto | UpdateEmployeeDto>(
    dto: T,
  ): T {
    return {
      ...dto,
      firstName: dto.firstName?.trim(),
      lastName: dto.lastName?.trim(),
      email: dto.email?.trim().toLowerCase(),
      phone: dto.phone?.trim(),
      color: dto.color?.trim().toUpperCase(),
      notes: dto.notes?.trim(),
    };
  }
}
