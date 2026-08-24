export interface EmailTemplate {
  subject: string;
  text: string;
}

export function emailVerificationTemplate(token: string): EmailTemplate {
  return {
    subject: "Verifica tu email de BUKIOO",
    text: `Hola,

Usa este codigo de 6 digitos para verificar tu email en BUKIOO:

${token}

Este codigo caduca en 10 minutos y solo puede utilizarse una vez.

Si no solicitaste esta verificacion, puedes ignorar este mensaje.

BUKIOO`,
  };
}
