import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./database/database.module";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import Joi from "joi";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid("development", "production", "test")
          .default("development"),

        PORT: Joi.number().port().default(3000),

        DATABASE_URL: Joi.string().uri().required(),

        FRONTEND_URL: Joi.string().uri().required(),

        JWT_ACCESS_SECRET: Joi.string().min(32).required(),

        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
      }),
    }),
    DatabaseModule,
    HealthModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 100,
        },
      ],

      errorMessage: (_context, throttlerLimitDetail) => {
        const seconds = throttlerLimitDetail.timeToBlockExpire;

        return `Demasiadas peticiones. Inténtalo de nuevo en ${seconds} segundos.`;
      },
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
