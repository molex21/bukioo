import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class SetOrganizationSubscriptionDto {
  @IsString()
  @MaxLength(30)
  planCode!: string;

  @IsIn(["TRIAL", "ACTIVE", "SUSPENDED"])
  status!: "TRIAL" | "ACTIVE" | "SUSPENDED";

  @IsOptional()
  @IsDateString()
  trialEndsAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
