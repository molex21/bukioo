import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class AdjustLoyaltyDto {
  @IsInt()
  @Min(-1_000_000_000)
  @Max(1_000_000_000)
  points!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  reason!: string;
}
