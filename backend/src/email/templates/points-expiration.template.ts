import type { EmailTemplate } from "./email-verification.template";

export interface PointsExpirationTemplateInput {
  businessName: string;
  points: number;
  expiresAt: Date;
  timezone: string;
  daysBeforeExpiration: 30 | 7;
}

export function pointsExpirationTemplate(
  input: PointsExpirationTemplateInput,
): EmailTemplate {
  const expirationDate = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
    timeZone: input.timezone,
  }).format(input.expiresAt);

  return {
    subject: `Tus puntos de ${input.businessName} caducan pronto`,
    text: `Hola,

Tienes ${input.points} puntos de ${input.businessName} que caducan el ${expirationDate}.

Quedan ${input.daysBeforeExpiration} dias para utilizarlos.

BUKIOO`,
  };
}
