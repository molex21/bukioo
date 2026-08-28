import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { EmailProvider, ResendEmailProvider } from "./email.provider";
import { ACCESS_TOKEN_EXPIRES_IN_SECONDS } from "./auth.constants";
import { OnboardingRepository } from "./onboarding.repository";
import { UserSessionsRepository } from "./user-sessions.repository";
import { UserTokensRepository } from "./user-tokens.repository";
import { UsersRepository } from "./users.repository";
import { EmployeeRegistrationRepository } from "./employee-registration.repository";
import { TwoFactorRepository } from "./two-factor.repository";
import { AuthorizationRepository } from "./authorization.repository";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: {
          expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    UsersRepository,
    EmployeeRegistrationRepository,
    UserSessionsRepository,
    OnboardingRepository,
    UserTokensRepository,
    TwoFactorRepository,
    AuthorizationRepository,
    RolesGuard,
    {
      provide: EmailProvider,
      useClass: ResendEmailProvider,
    },
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule, EmailProvider],
})
export class AuthModule {}
