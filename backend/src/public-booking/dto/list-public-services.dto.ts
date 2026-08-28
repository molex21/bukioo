import { IsUUID } from "class-validator";

export class ListPublicServicesDto {
  @IsUUID()
  businessId!: string;
}
