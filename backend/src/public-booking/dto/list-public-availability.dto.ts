import { IsDateString, IsUUID } from "class-validator";

export class ListPublicAvailabilityDto {
  @IsUUID()
  businessId!: string;

  @IsUUID()
  employeeId!: string;

  @IsUUID()
  serviceId!: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
