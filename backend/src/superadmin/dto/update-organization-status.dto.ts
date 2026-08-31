import { IsIn } from "class-validator";

export class UpdateOrganizationStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED"])
  status!: "ACTIVE" | "SUSPENDED";
}
