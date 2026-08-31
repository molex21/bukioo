import type { NestExpressApplication } from "@nestjs/platform-express";
import { configureHttpApplication } from "./http-configuration";

describe("configureHttpApplication", () => {
  it("uses the configured number of trusted proxy hops", () => {
    const set = jest.fn();
    const enableCors = jest.fn();
    const app = {
      set,
      useBodyParser: jest.fn(),
      enableCors,
      use: jest.fn(),
      setGlobalPrefix: jest.fn(),
      useGlobalPipes: jest.fn(),
    } as unknown as NestExpressApplication;

    configureHttpApplication(app, {
      frontendUrl: "https://app.example.com",
      trustProxyHops: 2,
    });

    expect(set).toHaveBeenCalledWith("trust proxy", 2);
    expect(enableCors).toHaveBeenCalledWith({
      origin: "https://app.example.com",
      credentials: true,
    });
  });

  it("does not trust proxy headers when configured with zero hops", () => {
    const set = jest.fn();
    const app = {
      set,
      useBodyParser: jest.fn(),
      enableCors: jest.fn(),
      use: jest.fn(),
      setGlobalPrefix: jest.fn(),
      useGlobalPipes: jest.fn(),
    } as unknown as NestExpressApplication;

    configureHttpApplication(app, {
      frontendUrl: "http://localhost:5173",
      trustProxyHops: 0,
    });

    expect(set).toHaveBeenCalledWith("trust proxy", 0);
  });
});
