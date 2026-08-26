import { IsArray, IsUUID } from "class-validator";

export class ReplaceServiceEmployeesDto {
  @IsArray()
  @IsUUID("4", { each: true })
  employeeIds!: string[];
}
