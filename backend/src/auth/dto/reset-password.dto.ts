import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ResetPasswordDto {
  @IsString({ message: "El código de recuperación debe ser un texto." })
  @Matches(/^\d{6}$/, {
    message: "El código de recuperación debe tener seis dígitos.",
  })
  token!: string;

  @IsString({ message: "La contraseña debe ser un texto." })
  @MinLength(12, {
    message: "La contraseña debe tener al menos 12 caracteres.",
  })
  @MaxLength(128, {
    message: "La contraseña no puede superar los 128 caracteres.",
  })
  password!: string;
}
