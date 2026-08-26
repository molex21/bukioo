import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateAppointmentDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  employeeId!: string;

  @IsUUID()
  serviceId!: string;

  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customerNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNotes?: string;
}
