import { Transform } from "class-transformer";
import { IsInt, IsString, Max, MaxLength, Min } from "class-validator";

export class RedeemLoyaltyPointsDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  points!: number;

  @Transform(({ value }) => String(value).trim())
  @IsString()
  @Min(1)
  @MaxLength(255)
  reason!: string;
}
