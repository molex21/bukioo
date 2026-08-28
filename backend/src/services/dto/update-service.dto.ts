import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class UpdateServiceDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_440)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_440)
  bufferBeforeMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_440)
  bufferAfterMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(43_200)
  minimumBookingNoticeMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3_650)
  maximumBookingAdvanceDays?: number;

  @IsOptional()
  @IsBoolean()
  sameDayBooking?: boolean;

  @IsOptional()
  @IsBoolean()
  autoConfirmAppointments?: boolean | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
