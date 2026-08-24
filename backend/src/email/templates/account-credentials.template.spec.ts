import { accountCredentialsTemplate } from "./account-credentials.template";

describe("accountCredentialsTemplate", () => {
  it("creates a plain-text email containing the temporary password", () => {
    const template = accountCredentialsTemplate("aB3dE_7z");

    expect(template.subject).toBe("Tus credenciales temporales de BUKIOO");
    expect(template.text).toContain("aB3dE_7z");
    expect(template.text).toContain("8 caracteres");
    expect(template.text).toContain("contrasena definitiva");
  });
});
