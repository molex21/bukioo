import { IsString, Matches } from "class-validator";

export class VerifyTwoFactorDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
