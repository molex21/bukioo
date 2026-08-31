import { ConfigService } from "@nestjs/config";
import { ResendEmailProvider } from "./email.provider";

describe("ResendEmailProvider", () => {
  const configServiceMock = { get: jest.fn() };
  const provider = new ResendEmailProvider(
    configServiceMock as unknown as ConfigService,
  );

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
  });
});
