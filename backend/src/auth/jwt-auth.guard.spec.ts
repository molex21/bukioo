import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;

  const jwtServiceMock = {
    verifyAsync: jest.fn(),
  };
  const configServiceMock = {
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    guard = module.get(JwtAuthGuard);
  });

  afterEach(() => {
    jwtServiceMock.verifyAsync.mockReset();
    configServiceMock.getOrThrow.mockReset();
  });

  it("accepts a valid Bearer access token and stores its user id", async () => {
    const request = { headers: { authorization: "Bearer access-token" } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    };
    configServiceMock.getOrThrow.mockReturnValue("access-secret");
    jwtServiceMock.verifyAsync.mockResolvedValue({ sub: "user-id" });

    await expect(guard.canActivate(context as never)).resolves.toBe(true);

    expect(request).toMatchObject({ userId: "user-id" });
    expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith("access-token", {
      secret: "access-secret",
    });
  });

  it("rejects a request without a Bearer access token", async () => {
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    };

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtServiceMock.verifyAsync).not.toHaveBeenCalled();
  });

  it("rejects an invalid access token", async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: "Bearer invalid-access-token" },
        }),
      }),
    };
    configServiceMock.getOrThrow.mockReturnValue("access-secret");
    jwtServiceMock.verifyAsync.mockRejectedValue(new Error("invalid token"));

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
