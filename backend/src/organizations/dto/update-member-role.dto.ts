import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsUUID,
  ValidateIf,
} from "class-validator";

export class UpdateMemberRoleDto {
  @IsIn(["ADMIN", "MANAGER", "EMPLOYEE"])
  role!: "ADMIN" | "MANAGER" | "EMPLOYEE";

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID("all", { each: true })
  businessIds?: string[];
}
