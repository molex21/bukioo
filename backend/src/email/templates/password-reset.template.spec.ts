import { passwordResetTemplate } from "./password-reset.template";

describe("passwordResetTemplate", () => {
  it("returns a plain-text message with the reset code", () => {
    const template = passwordResetTemplate("123456");

    expect(template.subject).toBe("Restablece tu contrasena de BUKIOO");
    expect(template.text).toContain("123456");
  });
});
