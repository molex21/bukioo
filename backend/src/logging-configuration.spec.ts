import type { ServerResponse } from "http";
import { createPinoHttpOptions } from "./logging-configuration";

describe("createPinoHttpOptions", () => {
  it("creates a request id and redacts authentication data", () => {
    const setHeader = jest.fn();
    const options = createPinoHttpOptions("debug");

    const requestId = options.genReqId(
      {} as never,
      { setHeader } as unknown as ServerResponse,
    );

    expect(options.level).toBe("debug");
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(setHeader).toHaveBeenCalledWith("X-Request-Id", requestId);
    expect(options.redact.censor).toBe("[REDACTED]");
    expect(options.redact.paths).toEqual(
      expect.arrayContaining([
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
        "req.body.token",
      ]),
    );
  });
});
