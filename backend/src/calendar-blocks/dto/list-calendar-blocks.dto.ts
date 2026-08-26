import { IsDateString, IsOptional } from "class-validator";

export class ListCalendarBlocksDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
