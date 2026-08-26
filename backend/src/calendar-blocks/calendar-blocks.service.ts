import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CalendarBlocksRepository,
  type CalendarBlockRecord,
} from "./calendar-blocks.repository";
import { CreateCalendarBlockDto } from "./dto/create-calendar-block.dto";
import { UpdateCalendarBlockDto } from "./dto/update-calendar-block.dto";
import { ListCalendarBlocksDto } from "./dto/list-calendar-blocks.dto";

@Injectable()
export class CalendarBlocksService {
  constructor(
    private readonly calendarBlocksRepository: CalendarBlocksRepository,
  ) {}

  async create(
    businessId: string,
    dto: CreateCalendarBlockDto,
    userId: string,
  ): Promise<CalendarBlockRecord> {
    await this.assertCanManage(userId, businessId);
    await this.assertEmployee(dto.employeeId, businessId);
    this.assertDates(dto.startAt, dto.endAt);
    return this.calendarBlocksRepository.create(
      businessId,
      { ...dto, reason: dto.reason?.trim() },
      userId,
    );
  }

  async list(
    businessId: string,
    filters: ListCalendarBlocksDto,
    userId: string,
  ): Promise<CalendarBlockRecord[]> {
    await this.assertCanAccess(userId, businessId);
    this.assertValidRange(filters);
    return this.calendarBlocksRepository.listByBusiness(businessId, filters);
  }

  async listByEmployee(
    businessId: string,
    employeeId: string,
    filters: ListCalendarBlocksDto,
    userId: string,
  ): Promise<CalendarBlockRecord[]> {
    await this.assertCanAccess(userId, businessId);
    await this.assertEmployee(employeeId, businessId);
    this.assertValidRange(filters);
    return this.calendarBlocksRepository.listByBusiness(
      businessId,
      filters,
      employeeId,
    );
  }

  async update(
    businessId: string,
    blockId: string,
    dto: UpdateCalendarBlockDto,
    userId: string,
  ): Promise<CalendarBlockRecord> {
    await this.assertCanManage(userId, businessId);
    const block = await this.getBlock(businessId, blockId);
    this.assertDates(
      dto.startAt ?? block.start_at.toISOString(),
      dto.endAt ?? block.end_at.toISOString(),
    );
    return this.calendarBlocksRepository.update(block, {
      ...dto,
      reason: dto.reason?.trim(),
    });
  }

  async remove(
    businessId: string,
    blockId: string,
    userId: string,
  ): Promise<void> {
    await this.assertCanManage(userId, businessId);
    const block = await this.getBlock(businessId, blockId);
    if (!(await this.calendarBlocksRepository.remove(block)))
      throw new NotFoundException("Bloqueo no encontrado");
  }

  private assertDates(startAt: string, endAt: string): void {
    if (new Date(startAt).getTime() >= new Date(endAt).getTime())
      throw new BadRequestException(
        "La fecha de inicio debe ser anterior a la fecha de fin",
      );
  }
  private assertValidRange(filters: ListCalendarBlocksDto): void {
    if (
      filters.from &&
      filters.to &&
      new Date(filters.from).getTime() >= new Date(filters.to).getTime()
    )
      throw new BadRequestException(
        "La fecha from debe ser anterior a la fecha to",
      );
  }
  private async assertCanAccess(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.calendarBlocksRepository.canAccessBusiness(
        userId,
        businessId,
      ))
    )
      throw new ForbiddenException("No tienes acceso a este negocio");
  }
  private async assertCanManage(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.calendarBlocksRepository.canManageBusiness(
        userId,
        businessId,
      ))
    )
      throw new ForbiddenException("No tienes permiso para gestionar bloqueos");
  }
  private async assertEmployee(
    employeeId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.calendarBlocksRepository.employeeBelongsToBusiness(
        employeeId,
        businessId,
      ))
    )
      throw new BadRequestException(
        "El empleado no pertenece a este negocio o no esta activo",
      );
  }
  private async getBlock(
    businessId: string,
    blockId: string,
  ): Promise<CalendarBlockRecord> {
    const block = await this.calendarBlocksRepository.findById(
      businessId,
      blockId,
    );
    if (!block) throw new NotFoundException("Bloqueo no encontrado");
    return block;
  }
}
