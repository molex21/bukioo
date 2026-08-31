import type { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { AppointmentsService } from "../appointments/appointments.service";
import { CustomerAuthService } from "./customer-auth.service";
import { CustomerAuthController } from "./customer-auth.controller";

describe("CustomerAuthController", () => {
  it("uses a secure, scoped refresh cookie in production", async () => {
    const service = {
      login: jest.fn().mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        tokenType: "Bearer",
        expiresIn: 900,
      }),
    };
    const config = { get: jest.fn().mockReturnValue("production") };
    const controller = new CustomerAuthController(
      service as unknown as CustomerAuthService,
      {} as AppointmentsService,
      config as unknown as ConfigService,
    );
    const cookie = jest.fn();

    await controller.login(
      "mi-negocio",
      { email: "customer@example.com", password: "a-secure-password" },
      { cookie } as unknown as Response,
    );

    expect(cookie).toHaveBeenCalledWith(
      "customer_refresh_token",
      "refresh-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/api/v1/public/mi-negocio/auth",
      }),
    );
  });
});
