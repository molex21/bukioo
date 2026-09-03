import { IsEmail, MaxLength } from "class-validator";

export class ForgotPasswordDto {
  @IsEmail(
    {},
    { message: "Introduce una dirección de correo electrónico válida." },
  )
  @MaxLength(320, {
    message:
      "La dirección de correo electrónico no puede superar los 320 caracteres.",
  })
  email!: string;
}
