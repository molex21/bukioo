import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./database/database.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { BusinessesModule } from "./businesses/businesses.module";
import { EmployeesModule } from "./employees/employees.module";
import { ServiceCategoriesModule } from "./service-categories/service-categories.module";
import { ServicesModule } from "./services/services.module";
import { CustomersModule } from "./customers/customers.module";
import { WorkingHoursModule } from "./working-hours/working-hours.module";
import { CalendarBlocksModule } from "./calendar-blocks/calendar-blocks.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { AuditModule } from "./audit/audit.module";
import { AvailabilityModule } from "./availability/availability.module";
import { CustomerAuthModule } from "./customer-auth/customer-auth.module";
import { PublicBookingModule } from "./public-booking/public-booking.module";
import { LoyaltyModule } from "./loyalty/loyalty.module";
import { LoyaltyJobsModule } from "./loyalty-jobs/loyalty-jobs.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ReportsModule } from "./reports/reports.module";
import { SuperadminModule } from "./superadmin/superadmin.module";
import { LoggerModule } from "nestjs-pino";
import { createPinoHttpOptions } from "./logging-configuration";
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

        TRUST_PROXY_HOPS: Joi.number().integer().min(0).max(10).default(0),

        LOG_LEVEL: Joi.string()
          .valid("fatal", "error", "warn", "info", "debug", "trace", "silent")
          .default("info"),

        JWT_ACCESS_SECRET: Joi.string().min(32).required(),

        JWT_REFRESH_SECRET: Joi.string().min(32).required(),

        JWT_EMAIL_VERIFICATION_SECRET: Joi.string().min(32).required(),

        TOTP_ENCRYPTION_KEY: Joi.string().min(32).required(),

        ONBOARDING_SECRET: Joi.string().min(32).required(),

        PGBOSS_ENABLED: Joi.boolean().default(true),

        EMAIL_DELIVERY_ENABLED: Joi.boolean().default(true),

        RESEND_API_KEY: Joi.string().when("NODE_ENV", {
          is: "production",
          then: Joi.when("EMAIL_DELIVERY_ENABLED", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
          otherwise: Joi.optional(),
        }),

        RESEND_FROM_EMAIL: Joi.string()
          .email()
          .when("NODE_ENV", {
            is: "production",
            then: Joi.when("EMAIL_DELIVERY_ENABLED", {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            otherwise: Joi.optional(),
          }),
      }),
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: createPinoHttpOptions(
          configService.getOrThrow<string>("LOG_LEVEL"),
        ),
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
    BusinessesModule,
    EmployeesModule,
    ServiceCategoriesModule,
    ServicesModule,
    CustomersModule,
    WorkingHoursModule,
    CalendarBlocksModule,
    AppointmentsModule,
    AuditModule,
    AvailabilityModule,
    CustomerAuthModule,
    PublicBookingModule,
    LoyaltyModule,
    LoyaltyJobsModule,
    NotificationsModule,
    ReportsModule,
    SuperadminModule,
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
