import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from "class-validator";
import { loyaltyEarningTypes, type LoyaltyEarningType } from "../loyalty.types";

export class UpdateLoyaltySettingsDto {
  @IsOptional()
  @IsBoolean()
  loyaltyEnabled?: boolean;

  @IsOptional()
  @IsIn(loyaltyEarningTypes.filter((type) => type !== "INHERIT"))
  defaultLoyaltyEarningType?: Exclude<LoyaltyEarningType, "INHERIT">;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1_000_000)
  defaultLoyaltyPointsPerCurrencyUnit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  defaultLoyaltyFixedPoints?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  pointsExpirationMonths?: number | null;
}
