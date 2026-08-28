import { IsDateString, IsUUID } from "class-validator";

export class ListAvailabilityDto {
  @IsUUID()
  employeeId!: string;

  @IsUUID()
  serviceId!: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
