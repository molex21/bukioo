import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class GetReportsOverviewDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;
}
