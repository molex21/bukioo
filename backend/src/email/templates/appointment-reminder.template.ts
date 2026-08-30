import type { EmailTemplate } from "./email-verification.template";

export interface AppointmentReminderTemplateInput {
  businessName: string;
  referenceCode: string;
  serviceName: string;
  employeeName: string;
  startAt: Date;
  timezone: string;
}

export function appointmentReminderTemplate(
  input: AppointmentReminderTemplateInput,
): EmailTemplate {
  const appointmentTime = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: input.timezone,
  }).format(input.startAt);

  return {
    subject: `Recordatorio de tu cita en ${input.businessName}`,
    text: `Hola,

Te recordamos que tienes una cita en ${input.businessName}.

Referencia: ${input.referenceCode}
Servicio: ${input.serviceName}
Profesional: ${input.employeeName}
Fecha y hora: ${appointmentTime}

BUKIOO`,
  };
}
