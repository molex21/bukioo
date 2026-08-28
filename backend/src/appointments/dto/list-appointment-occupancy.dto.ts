import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class ListAppointmentOccupancyDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
