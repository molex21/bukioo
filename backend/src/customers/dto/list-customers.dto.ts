import { Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export const customerSortFields = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "createdAt",
] as const;

const customerPageLimits = [10, 25, 50, 100] as const;

export class ListCustomersDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  q?: string;

  @IsIn(customerSortFields)
  sortBy: (typeof customerSortFields)[number] = "firstName";

  @IsIn(["asc", "desc"])
  sortDirection: "asc" | "desc" = "asc";

  @Transform(({ value }) => Number(value))
  @IsIn(customerPageLimits)
  @IsInt()
  limit = 25;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset = 0;
}
