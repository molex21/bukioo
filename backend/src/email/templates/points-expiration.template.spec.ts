import { pointsExpirationTemplate } from "./points-expiration.template";

describe("pointsExpirationTemplate", () => {
  it("creates a plain-text expiration notice", () => {
    const template = pointsExpirationTemplate({
      businessName: "Peluqueria BUKIOO",
      points: 25,
      expiresAt: new Date("2026-09-30T23:59:59.999Z"),
      timezone: "UTC",
      daysBeforeExpiration: 30,
    });

    expect(template.subject).toContain("Peluqueria BUKIOO");
    expect(template.text).toContain("25 puntos");
    expect(template.text).toContain("30 dias");
  });
});
