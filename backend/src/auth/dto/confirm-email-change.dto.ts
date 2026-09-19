import { IsString, Matches } from "class-validator";

export class ConfirmEmailChangeDto {
  @IsString()
  @Matches(/^\d{6}$/)
  token!: string;
}
