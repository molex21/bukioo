import { IsUUID } from "class-validator";

export class ListPublicEmployeesDto {
  @IsUUID()
  businessId!: string;

  @IsUUID()
  serviceId!: string;
}
