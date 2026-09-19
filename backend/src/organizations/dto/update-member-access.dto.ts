import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsUUID,
} from "class-validator";

export class UpdateMemberStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED"])
  status!: "ACTIVE" | "SUSPENDED";

  @IsIn(["ACTIVE", "SUSPENDED"])
  expectedStatus!: "ACTIVE" | "SUSPENDED";

  @IsIn(["ADMIN", "MANAGER", "EMPLOYEE"])
  expectedRole!: "ADMIN" | "MANAGER" | "EMPLOYEE";
}

export class UpdateMemberBusinessesDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID("all", { each: true })
  businessIds!: string[];

  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID("all", { each: true })
  expectedBusinessIds!: string[];

  @IsIn(["MANAGER", "EMPLOYEE"])
  expectedRole!: "MANAGER" | "EMPLOYEE";
}
