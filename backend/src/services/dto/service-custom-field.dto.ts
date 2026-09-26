import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export const serviceCustomFieldTypes = [
  "NUMBER",
  "SELECT",
  "TEXT",
  "BOOLEAN",
] as const;
export type ServiceCustomFieldType = (typeof serviceCustomFieldTypes)[number];

export const serviceCustomFieldPricingModes = [
  "NONE",
  "PER_UNIT",
  "OPTION",
] as const;
export type ServiceCustomFieldPricingMode =
  (typeof serviceCustomFieldPricingModes)[number];

export const serviceCustomFieldDurationModes = [
  "NONE",
  "PER_UNIT",
  "OPTION",
] as const;
export type ServiceCustomFieldDurationMode =
  (typeof serviceCustomFieldDurationModes)[number];

export class ServiceCustomFieldOptionDto {
  @IsString()
  @MaxLength(100)
  value!: string;

  @IsString()
  @MaxLength(100)
  label!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  priceModifier?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(1_440)
  durationModifierMinutes?: number;
}

export class ServiceCustomFieldDto {
  @IsUUID()
  id!: string;

  @IsString()
  @MaxLength(100)
  label!: string;

  @IsIn(serviceCustomFieldTypes)
  fieldType!: ServiceCustomFieldType;

  @IsBoolean()
  required!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  unitLabel?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  minValue?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  maxValue?: number;

  @IsIn(serviceCustomFieldPricingModes)
  pricingMode!: ServiceCustomFieldPricingMode;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  unitPrice?: number;

  @IsOptional()
  @IsIn(serviceCustomFieldDurationModes)
  durationMode?: ServiceCustomFieldDurationMode;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(1_440)
  unitDurationMinutes?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceCustomFieldOptionDto)
  options?: ServiceCustomFieldOptionDto[];
}

export type ServiceCustomField = {
  id: string;
  label: string;
  fieldType: ServiceCustomFieldType;
  required: boolean;
  unitLabel?: string;
  minValue?: number;
  maxValue?: number;
  pricingMode: ServiceCustomFieldPricingMode;
  unitPrice?: number;
  durationMode: ServiceCustomFieldDurationMode;
  unitDurationMinutes?: number;
  options?: Array<{
    value: string;
    label: string;
    priceModifier?: number;
    durationModifierMinutes?: number;
  }>;
};
