import { IsUUID } from "class-validator";

export class ListBusinessesDto {
  @IsUUID()
  organizationId!: string;
}
