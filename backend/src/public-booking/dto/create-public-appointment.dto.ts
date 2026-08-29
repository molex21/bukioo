import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreatePublicAppointmentDto {
  @IsUUID() businessId!: string;
  @IsUUID() employeeId!: string;
  @IsUUID() serviceId!: string;
  @IsDateString() startAt!: string;
  @IsString() @MaxLength(100) firstName!: string;
  @IsOptional() @IsString() @MaxLength(150) lastName?: string;
  @IsEmail() @MaxLength(320) email!: string;
  @IsString() @MaxLength(32) phone!: string;
  @IsOptional() @IsString() @MaxLength(2000) customerNotes?: string;
}
