import { Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class ListOrganizationMembersDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @IsIn(["OWNER", "ADMIN", "MANAGER", "EMPLOYEE", "CLIENT"])
  role?: string;

  @IsOptional()
  @IsIn(["ACTIVE", "INVITED", "SUSPENDED"])
  status?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset?: number;
}
