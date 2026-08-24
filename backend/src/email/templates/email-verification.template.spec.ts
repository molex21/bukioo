import { emailVerificationTemplate } from "./email-verification.template";

describe("emailVerificationTemplate", () => {
  it("creates a plain-text email containing a six-digit verification code", () => {
    const template = emailVerificationTemplate("123456");

    expect(template.subject).toBe("Verifica tu email de BUKIOO");
    expect(template.text).toContain("123456");
    expect(template.text).toContain("6 digitos");
    expect(template.text).toContain("10 minutos");
  });
});
