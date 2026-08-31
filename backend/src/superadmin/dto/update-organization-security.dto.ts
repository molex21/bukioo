import { IsBoolean } from "class-validator";

export class UpdateOrganizationSecurityDto {
  @IsBoolean()
  require2faForAdmins!: boolean;
}
