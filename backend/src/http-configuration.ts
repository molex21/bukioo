import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";

export interface HttpConfiguration {
  frontendUrl: string;
  trustProxyHops: number;
}

export function configureHttpApplication(
  app: NestExpressApplication,
  configuration: HttpConfiguration,
): void {
  app.set("trust proxy", configuration.trustProxyHops);
  app.useBodyParser("json", { limit: "1mb" });
  app.useBodyParser("urlencoded", { limit: "1mb", extended: true });
  app.enableCors({
    origin: configuration.frontendUrl,
    credentials: true,
  });
  app.use(helmet());
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
