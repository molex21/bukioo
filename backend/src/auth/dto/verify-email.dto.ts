import { IsString, Matches } from "class-validator";

export class VerifyEmailDto {
  @IsString()
  @Matches(/^\d{6}$/)
  token!: string;
}
