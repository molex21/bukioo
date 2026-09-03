import { IsOptional, IsUrl, MaxLength } from "class-validator";

export class UpdateOrganizationBrandingDto {
  @IsOptional()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @MaxLength(2048)
  logoUrl?: string | null;
}
