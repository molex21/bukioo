import { appointmentReminderTemplate } from "./appointment-reminder.template";

describe("appointmentReminderTemplate", () => {
  it("creates a plain-text appointment reminder", () => {
    const template = appointmentReminderTemplate({
      businessName: "Peluqueria BUKIOO",
      referenceCode: "APT-123",
      serviceName: "Corte",
      employeeName: "Ana Lopez",
      startAt: new Date("2026-09-01T10:00:00.000Z"),
      timezone: "UTC",
    });

    expect(template.subject).toContain("Peluqueria BUKIOO");
    expect(template.text).toContain("APT-123");
    expect(template.text).toContain("Corte");
    expect(template.text).toContain("Ana Lopez");
  });
});
