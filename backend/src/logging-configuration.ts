import { randomUUID } from "crypto";
import type { IncomingMessage, ServerResponse } from "http";

const REDACTED_LOG_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers.x-api-key",
  "req.body.password",
  "req.body.token",
  "req.body.refreshToken",
  "req.body.code",
  "res.headers.set-cookie",
];

export function createPinoHttpOptions(logLevel: string) {
  return {
    level: logLevel,
    genReqId: (_request: IncomingMessage, response: ServerResponse) => {
      const requestId = randomUUID();
      response.setHeader("X-Request-Id", requestId);
      return requestId;
    },
    redact: {
      paths: REDACTED_LOG_PATHS,
      censor: "[REDACTED]",
    },
  };
}
