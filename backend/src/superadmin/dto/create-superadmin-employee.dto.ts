import { OmitType } from "@nestjs/mapped-types";
import { IsEmail, IsIn, MaxLength, ValidateIf } from "class-validator";
import { CreateEmployeeDto } from "../../employees/dto/create-employee.dto";

export class CreateSuperadminEmployeeDto extends OmitType(CreateEmployeeDto, [
  "inviteUser",
  "notes",
  "email",
] as const) {
  @ValidateIf(
    (object: CreateSuperadminEmployeeDto) =>
      object.userId === undefined || object.email !== undefined,
  )
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ValidateIf(
    (object: CreateSuperadminEmployeeDto) =>
      object.userId === undefined || object.role !== undefined,
  )
  @IsIn(["MANAGER", "EMPLOYEE"])
  role?: "MANAGER" | "EMPLOYEE";
}
