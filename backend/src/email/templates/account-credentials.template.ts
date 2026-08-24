import type { EmailTemplate } from "./email-verification.template";

export function accountCredentialsTemplate(
  temporaryPassword: string,
): EmailTemplate {
  return {
    subject: "Tus credenciales temporales de BUKIOO",
    text: `Hola,

Tu contrasena temporal de 8 caracteres de BUKIOO es:

${temporaryPassword}

Inicia sesion con tu email y esta contrasena. Despues verificaremos tu email y te pediremos establecer una contrasena definitiva.

Esta contrasena deja de funcionar cuando establezcas la definitiva.

BUKIOO`,
  };
}
