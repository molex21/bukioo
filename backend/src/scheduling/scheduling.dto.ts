import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class TemplateDto {
  @IsOptional() @IsIn(["DAY", "CYCLE"]) kind?: "DAY" | "CYCLE";
  @IsString() @MaxLength(100) name!: string;
  @IsArray() pattern!: unknown[];
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
}
export class SchedulingCommandDto {
  @IsObject() command!: Record<string, unknown>;
}
