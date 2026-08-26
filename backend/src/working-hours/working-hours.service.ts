import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ReplaceWorkingHoursDto,
  type WorkingHourDto,
} from "./dto/replace-working-hours.dto";
import {
  WorkingHoursRepository,
  type ActiveEmployeeRecord,
} from "./working-hours.repository";

@Injectable()
export class WorkingHoursService {
  constructor(
    private readonly workingHoursRepository: WorkingHoursRepository,
  ) {}

  async list(businessId: string, employeeId: string, userId: string) {
    await this.assertCanAccess(userId, businessId);
    const employee = await this.getEmployee(businessId, employeeId);
    return this.workingHoursRepository.list(employee);
  }

  async replace(
    businessId: string,
    employeeId: string,
    dto: ReplaceWorkingHoursDto,
    userId: string,
  ): Promise<void> {
    await this.assertCanManage(userId, businessId);
    const employee = await this.getEmployee(businessId, employeeId);
    this.assertValidHours(dto.hours);
    await this.workingHoursRepository.replace(employee, dto.hours);
  }

  private assertValidHours(hours: WorkingHourDto[]): void {
    const ordered = [...hours].sort(
      (a, b) =>
        a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
    );
    for (let index = 0; index < ordered.length; index += 1) {
      const current = ordered[index];
      if (current.startTime >= current.endTime) {
        throw new BadRequestException(
          "La hora de inicio debe ser anterior a la hora de fin",
        );
      }
      const previous = ordered[index - 1];
      if (
        previous &&
        previous.dayOfWeek === current.dayOfWeek &&
        previous.endTime > current.startTime
      ) {
        throw new BadRequestException(
          "Los turnos del mismo dia no pueden solaparse",
        );
      }
    }
  }

  private async assertCanAccess(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.workingHoursRepository.canAccessBusiness(userId, businessId))
    ) {
      throw new ForbiddenException("No tienes acceso a este negocio");
    }
  }

  private async assertCanManage(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.workingHoursRepository.canManageBusiness(userId, businessId))
    ) {
      throw new ForbiddenException("No tienes permiso para gestionar horarios");
    }
  }

  private async getEmployee(
    businessId: string,
    employeeId: string,
  ): Promise<ActiveEmployeeRecord> {
    const employee = await this.workingHoursRepository.findActiveEmployee(
      businessId,
      employeeId,
    );
    if (!employee) throw new NotFoundException("Empleado no encontrado");
    return employee;
  }
}
