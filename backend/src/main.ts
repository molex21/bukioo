import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import {
  DocumentBuilder,
  SwaggerModule,
  type PathsObject,
} from "@nestjs/swagger";
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
  if (
    configService.get<string>("NODE_ENV") === "development" &&
    configService.get<boolean>("SWAGGER_ENABLED")
  ) {
    const openApiConfig = new DocumentBuilder()
      .setTitle("BUKIOO API")
      .setDescription(
        "API REST para la gestion de negocios, agenda y clientes.",
      )
      .setVersion("1.0")
      .addBearerAuth()
      .addCookieAuth("refresh_token")
      .addSecurityRequirements("bearer")
      .build();
    const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
    markPublicSwaggerOperations(openApiDocument.paths);
    SwaggerModule.setup("api/docs", app, openApiDocument, {
      jsonDocumentUrl: "api/docs-json",
    });
  }

  await app.listen(configService.getOrThrow<number>("PORT"));
}
void bootstrap();

function markPublicSwaggerOperations(paths: PathsObject): void {
  const publicOperations = [
    "get /api/v1",
    "get /api/v1/health",
    "post /api/v1/auth/onboard",
    "post /api/v1/auth/login",
    "post /api/v1/auth/refresh",
    "post /api/v1/auth/logout",
    "post /api/v1/auth/email/verification/request",
    "post /api/v1/auth/email/verify",
    "post /api/v1/auth/password/forgot",
    "post /api/v1/auth/password/reset",
    "post /api/v1/auth/2fa/verify",
    "post /api/v1/auth/2fa/recovery",
    "post /api/v1/auth/activate/verify",
    "post /api/v1/auth/activate/password",
    "post /api/v1/appointments/reschedule-proposals/accept",
    "post /api/v1/appointments/reschedule-proposals/reject",
    "post /api/v1/public/{organizationSlug}/auth/register",
    "post /api/v1/public/{organizationSlug}/auth/login",
    "post /api/v1/public/{organizationSlug}/auth/refresh",
    "post /api/v1/public/{organizationSlug}/auth/logout",
    "get /api/v1/public/{organizationSlug}/services",
    "get /api/v1/public/{organizationSlug}/employees",
    "get /api/v1/public/{organizationSlug}/availability",
    "post /api/v1/public/{organizationSlug}/appointments",
    "get /api/v1/public/appointments/{accessToken}",
    "post /api/v1/public/appointments/{accessToken}/cancel",
  ];

  for (const operation of publicOperations) {
    const [method, path] = operation.split(" ");
    const route = paths[path]?.[method as "get" | "post"];
    if (route) route.security = [];
  }
}
