import { IsString, Matches } from "class-validator";

export class UseRecoveryCodeDto {
  @IsString()
  @Matches(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  code!: string;
}
