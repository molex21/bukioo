import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsUUID,
  ValidateIf,
} from "class-validator";

export class CreateEmployeeDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  inviteUser?: boolean;

  @ValidateIf(
    (object: CreateEmployeeDto) =>
      object.userId === undefined || object.firstName !== undefined,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ValidateIf(
    (object: CreateEmployeeDto) =>
      object.userId === undefined || object.lastName !== undefined,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  notes?: string;
}
