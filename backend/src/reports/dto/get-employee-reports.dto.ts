import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class GetEmployeeReportsDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;
}
