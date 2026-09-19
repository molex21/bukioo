import { Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ResendEmailProvider } from "./email.provider";

describe("ResendEmailProvider", () => {
  let logError: jest.SpyInstance;
  const configServiceMock = { get: jest.fn() };
  const provider = new ResendEmailProvider(
    configServiceMock as unknown as ConfigService,
  );

  beforeEach(() => {
    configServiceMock.get.mockImplementation((key: string) => {
      if (key === "EMAIL_DELIVERY_ENABLED") return true;
      if (key === "RESEND_API_KEY") return "private-api-key";
      if (key === "RESEND_FROM_EMAIL") return "sender@example.com";
      return undefined;
    });
    logError = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    configServiceMock.get.mockReset();
    jest.restoreAllMocks();
  });

  it("does not call Resend when email delivery is disabled", async () => {
    configServiceMock.get.mockImplementation((key: string) => {
      if (key === "EMAIL_DELIVERY_ENABLED") return false;
      return undefined;
    });
    const fetchMock = jest.spyOn(global, "fetch");

    await expect(
      provider.sendEmailVerification({
        email: "user@example.com",
        token: "123456",
      }),
    ).resolves.toBeUndefined();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it("sends through Resend when email delivery is enabled", async () => {
    configServiceMock.get.mockImplementation((key: string) => {
      if (key === "EMAIL_DELIVERY_ENABLED") return true;
      if (key === "RESEND_API_KEY") return "resend-key";
      if (key === "RESEND_FROM_EMAIL") return "no-reply@example.com";
      return undefined;
    });
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true } as Response);

    await provider.sendEmailVerification({
      email: "user@example.com",
      token: "123456",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logError).not.toHaveBeenCalled();
  });

  it.each([
    [
      403,
      "validation_error",
      "You can only send testing emails to your own email address (private@example.com).",
      "testing_recipient_restriction",
    ],
    [
      403,
      "validation_error",
      "The private.example domain is not verified.",
      "sender_domain_not_verified",
    ],
    [
      400,
      "validation_error",
      "Invalid body: private-password private-api-key 123456",
      "invalid_email_request",
    ],
    [401, "invalid_api_key", "private-api-key", "invalid_api_key"],
    [403, "restricted_api_key", "API key is not active", "restricted_api_key"],
    [429, "rate_limit_exceeded", "Too many requests", "rate_limit_exceeded"],
    [429, "daily_quota_exceeded", "Quota exceeded", "daily_quota_exceeded"],
    [500, "application_error", "Internal error", "provider_internal_error"],
  ])(
    "logs safe diagnostics for %s %s (%s)",
    async (status, name, message, reason) => {
      jest
        .spyOn(global, "fetch")
        .mockResolvedValue(
          new Response(
            JSON.stringify({ name, message, extra: "private-password" }),
            { status },
          ),
        );

      const result = provider.sendAccountCredentials({
        email: "private@example.com",
        temporaryPassword: "private-password",
      });
      await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
      await expect(result).rejects.toMatchObject({
        response: { statusCode: 503, message: "No se pudo enviar el email" },
      });
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledWith({
        event: "email_delivery_failed",
        provider: "resend",
        providerStatus: status,
        providerCode: name,
        reason,
      });
    },
  );

  it.each([
    "<html>private-api-key private-password</html>",
    "null",
    "[]",
    JSON.stringify({ name: "private-api-key", message: "private-password" }),
    JSON.stringify({ name: "constructor", message: "private-password" }),
  ])(
    "handles unknown or non-JSON responses without logging their contents",
    async (body) => {
      jest
        .spyOn(global, "fetch")
        .mockResolvedValue(new Response(body, { status: 502 }));
      await expect(
        provider.sendPasswordReset({
          email: "private@example.com",
          token: "123456",
        }),
      ).rejects.toThrow("No se pudo enviar el email");
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledWith({
        event: "email_delivery_failed",
        provider: "resend",
        providerStatus: 502,
        providerCode: "unknown",
        reason: "unknown_provider_error",
      });
    },
  );

  it("preserves the 503 when reading the rejection body fails", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockRejectedValue(new Error("private-api-key")),
    } as unknown as Response);
    await expect(
      provider.sendEmailVerification({
        email: "private@example.com",
        token: "123456",
      }),
    ).rejects.toThrow("No se pudo enviar el email");
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        providerStatus: 503,
        reason: "unknown_provider_error",
      }),
    );
  });

  it("logs missing configuration without exposing configured values", async () => {
    configServiceMock.get.mockReturnValue(undefined);
    const fetchMock = jest.spyOn(global, "fetch");
    await expect(
      provider.sendEmailVerification({
        email: "private@example.com",
        token: "123456",
      }),
    ).rejects.toThrow("El envio de email no esta configurado");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith({
      event: "email_delivery_failed",
      provider: "resend",
      reason: "missing_configuration",
    });
  });
});
