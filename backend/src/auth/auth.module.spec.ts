import { ConfigModule } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { AuthModule } from "./auth.module";
import { EmailProvider } from "./email.provider";
import { EmployeeRegistrationRepository } from "./employee-registration.repository";
import { OnboardingRepository } from "./onboarding.repository";
import { UserSessionsRepository } from "./user-sessions.repository";
import { UserTokensRepository } from "./user-tokens.repository";
import { TwoFactorRepository } from "./two-factor.repository";
import { UsersRepository } from "./users.repository";

describe("AuthModule", () => {
  it("configures JWT access tokens with the environment secret", async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_ACCESS_SECRET:
                "test-access-secret-with-at-least-32-characters",
            }),
          ],
        }),
        AuthModule,
      ],
    })
      .overrideProvider(UsersRepository)
      .useValue({})
      .overrideProvider(EmployeeRegistrationRepository)
      .useValue({})
      .overrideProvider(UserSessionsRepository)
      .useValue({})
      .overrideProvider(OnboardingRepository)
      .useValue({})
      .overrideProvider(UserTokensRepository)
      .useValue({})
      .overrideProvider(TwoFactorRepository)
      .useValue({})
      .overrideProvider(EmailProvider)
      .useValue({})
      .compile();

    const jwtService = module.get(JwtService);
    const token = await jwtService.signAsync({ sub: "user-id" });

    await expect(jwtService.verifyAsync(token)).resolves.toMatchObject({
      sub: "user-id",
    });

    await module.close();
  });
});
