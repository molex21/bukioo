import type { EmailTemplate } from "./email-verification.template";

export function appointmentRescheduleTemplate(input: {
  referenceCode: string;
  startAt: Date;
  url: string;
  message?: string;
}): EmailTemplate {
  return {
    subject: "Confirma el cambio de tu cita en BUKIOO",
    text: `Hola,\n\nTe proponemos cambiar la cita ${input.referenceCode} a ${input.startAt.toISOString()}.\n\n${input.message ? `${input.message}\n\n` : ""}Acepta o rechaza la propuesta aqui:\n${input.url}\n\nEl enlace caduca en 48 horas y solo puede utilizarse una vez.\n\nBUKIOO`,
  };
}
