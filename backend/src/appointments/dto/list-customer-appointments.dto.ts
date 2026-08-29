import { Transform } from "class-transformer";
import { IsDateString, IsIn, IsOptional, IsUUID } from "class-validator";
import { appointmentStatuses } from "./list-appointments.dto";

export class ListCustomerAppointmentsDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsOptional()
  @Transform(({ value }) => String(value).toUpperCase())
  @IsIn(appointmentStatuses)
  status?: (typeof appointmentStatuses)[number];
}
