import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { configureHttpApplication } from "./http-configuration";
import { Logger } from "nestjs-pino";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  app.useLogger(app.get(Logger));

  configureHttpApplication(app, {
    frontendUrl: configService.getOrThrow<string>("FRONTEND_URL"),
    trustProxyHops: configService.getOrThrow<number>("TRUST_PROXY_HOPS"),
  });
  await app.listen(configService.getOrThrow<number>("PORT"));
}
void bootstrap();
