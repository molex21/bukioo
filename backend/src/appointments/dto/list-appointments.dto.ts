import { Transform } from "class-transformer";
import { IsDateString, IsIn, IsOptional, IsUUID } from "class-validator";

export const appointmentStatuses = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

export class ListAppointmentsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @Transform(({ value }) => String(value).toUpperCase())
  @IsIn(appointmentStatuses)
  status?: (typeof appointmentStatuses)[number];
}
