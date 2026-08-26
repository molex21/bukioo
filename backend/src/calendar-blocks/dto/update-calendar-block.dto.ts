import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { CALENDAR_BLOCK_TYPES } from "./create-calendar-block.dto";

export class UpdateCalendarBlockDto {
  @IsOptional()
  @IsIn(CALENDAR_BLOCK_TYPES)
  type?: (typeof CALENDAR_BLOCK_TYPES)[number];

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
