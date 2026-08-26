import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export const CALENDAR_BLOCK_TYPES = [
  "BREAK",
  "MEETING",
  "VACATION",
  "ABSENCE",
  "PERSONAL",
  "HOLIDAY",
  "MANUAL_BLOCK",
  "OTHER",
] as const;

export class CreateCalendarBlockDto {
  @IsUUID()
  employeeId!: string;

  @IsIn(CALENDAR_BLOCK_TYPES)
  type!: (typeof CALENDAR_BLOCK_TYPES)[number];

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
