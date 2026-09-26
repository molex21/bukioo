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
import { IsIn } from "class-validator";
import {
  loyaltyEarningTypes,
  type LoyaltyEarningType,
} from "../../loyalty/loyalty.types";
import { Type } from "class-transformer";
import { IsArray, ValidateNested } from "class-validator";
import { ServiceCustomFieldDto } from "./service-custom-field.dto";

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

  @IsOptional()
  @IsIn(loyaltyEarningTypes)
  loyaltyEarningType?: LoyaltyEarningType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  loyaltyFixedPoints?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1_000_000)
  loyaltyPointsPerCurrencyUnit?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceCustomFieldDto)
  customFields?: ServiceCustomFieldDto[];
}
