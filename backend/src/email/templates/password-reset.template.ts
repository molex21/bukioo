import { EmailTemplate } from "./email-verification.template";

export function passwordResetTemplate(token: string): EmailTemplate {
  return {
    subject: "Restablece tu contrasena de BUKIOO",
    text: `Hola,

Usa este codigo de 6 digitos para restablecer tu contrasena de BUKIOO:

${token}

Este codigo caduca en 10 minutos y solo puede utilizarse una vez.

Si no solicitaste este cambio, puedes ignorar este mensaje.

BUKIOO`,
  };
}
