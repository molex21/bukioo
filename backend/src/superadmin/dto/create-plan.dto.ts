import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  maxEmployees?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  maxLocations?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  maxMonthlyAppointments?: number | null;

  @IsOptional()
  @IsBoolean()
  canUseLoyalty?: boolean;

  @IsOptional()
  @IsBoolean()
  canUseAdvancedReports?: boolean;

  @IsOptional()
  @IsBoolean()
  canUseMultipleLocations?: boolean;

  @IsOptional()
  @IsBoolean()
  canUseSms?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  trialDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
