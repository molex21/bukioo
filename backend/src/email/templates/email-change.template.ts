import type { EmailTemplate } from "./email-verification.template";

export function emailChangeTemplate(token: string): EmailTemplate {
  return {
    subject: "Confirma el cambio de correo de BUKIOO",
    text: `Hola,

Usa este código de 6 dígitos para confirmar el cambio de correo de tu cuenta BUKIOO:

${token}

El código caduca en 10 minutos y solo puede utilizarse una vez. Si no solicitaste este cambio, ignora este mensaje.

BUKIOO`,
  };
}
