import { IsString, Matches } from "class-validator";

export class VerifyPasswordResetDto {
  @IsString({ message: "El código de recuperación debe ser un texto." })
  @Matches(/^\d{6}$/, {
    message: "El código de recuperación debe tener seis dígitos.",
  })
  token!: string;
}
