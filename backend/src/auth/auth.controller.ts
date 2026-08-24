import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  EMAIL_VERIFICATION_ATTEMPT_COOKIE_NAME,
  PASSWORD_ACTIVATION_ATTEMPT_COOKIE_NAME,
  EMAIL_VERIFICATION_ATTEMPT_EXPIRES_IN_SECONDS,
  REFRESH_TOKEN_EXPIRES_IN_SECONDS,
} from "./auth.constants";
import { LoginDto } from "./dto/login.dto";
import { OnboardDto } from "./dto/onboard.dto";
import { RequestEmailVerificationDto } from "./dto/request-email-verification.dto";
import { RegisterDto } from "./dto/register.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { SetInitialPasswordDto } from "./dto/set-initial-password.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import type { AuthenticatedRequest } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post("register")
  @UseGuards(JwtAuthGuard)
  register(
    @Body() registerDto: RegisterDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.register(registerDto, request.userId!);
  }

  @Post("onboard")
  onboard(
    @Body() onboardDto: OnboardDto,
    @Headers("x-onboarding-key") onboardingSecret: string | undefined,
  ) {
    return this.authService.onboard(onboardDto, onboardingSecret);
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() loginDto: LoginDto,
    @Headers("user-agent") userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const loginResult = await this.authService.login(loginDto, {
      userAgent,
      ipAddress,
    });

    if ("verificationAttemptToken" in loginResult) {
      this.setEmailVerificationAttemptCookie(
        response,
        loginResult.verificationAttemptToken,
      );
      response.status(HttpStatus.ACCEPTED);
      return { emailVerificationRequired: true };
    }

    const { refreshToken, ...loginResponse } = loginResult;

    this.setRefreshTokenCookie(response, refreshToken);

    return loginResponse;
  }

  @Post("refresh")
  async refresh(
    @Headers("cookie") cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...refreshResponse } = await this.authService.refresh(
      this.getRefreshToken(cookieHeader),
    );

    this.setRefreshTokenCookie(response, refreshToken);

    return refreshResponse;
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Headers("cookie") cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(this.getRefreshToken(cookieHeader));
    this.clearRefreshTokenCookie(response);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.me(request.userId!);
  }

  @Post("email/verification/request")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestEmailVerification(
    @Body() requestDto: RequestEmailVerificationDto,
  ) {
    await this.authService.requestEmailVerification(requestDto);
    return { status: "accepted" };
  }

  @Post("email/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post("activate/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async verifyInitialEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Headers("cookie") cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const passwordActivationAttemptToken =
      await this.authService.verifyInitialEmail(
        verifyEmailDto,
        this.getCookie(cookieHeader, EMAIL_VERIFICATION_ATTEMPT_COOKIE_NAME),
      );

    this.setPasswordActivationAttemptCookie(
      response,
      passwordActivationAttemptToken,
    );
    this.clearEmailVerificationAttemptCookie(response);

    return { emailVerified: true, passwordChangeRequired: true };
  }

  @Post("activate/password")
  @HttpCode(HttpStatus.OK)
  async setInitialPassword(
    @Body() setInitialPasswordDto: SetInitialPasswordDto,
    @Headers("cookie") cookieHeader: string | undefined,
    @Headers("user-agent") userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...activationResponse } =
      await this.authService.setInitialPassword(
        setInitialPasswordDto,
        this.getCookie(cookieHeader, PASSWORD_ACTIVATION_ATTEMPT_COOKIE_NAME),
        { userAgent, ipAddress },
      );

    this.setRefreshTokenCookie(response, refreshToken);
    this.clearPasswordActivationAttemptCookie(response);

    return activationResponse;
  }

  private getRefreshToken(
    cookieHeader: string | undefined,
  ): string | undefined {
    return this.getCookie(cookieHeader, REFRESH_TOKEN_COOKIE_NAME);
  }

  private getCookie(
    cookieHeader: string | undefined,
    name: string,
  ): string | undefined {
    const cookie = cookieHeader
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((item) => item.startsWith(`${name}=`));

    return cookie?.slice(name.length + 1);
  }

  private setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
  ): void {
    response.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>("NODE_ENV") === "production",
      sameSite: "lax",
      maxAge: REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000,
      path: "/api/v1/auth",
    });
  }

  private clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: this.configService.get<string>("NODE_ENV") === "production",
      sameSite: "lax",
      path: "/api/v1/auth",
    });
  }

  private setEmailVerificationAttemptCookie(
    response: Response,
    token: string,
  ): void {
    response.cookie(EMAIL_VERIFICATION_ATTEMPT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.configService.get<string>("NODE_ENV") === "production",
      sameSite: "lax",
      maxAge: EMAIL_VERIFICATION_ATTEMPT_EXPIRES_IN_SECONDS * 1000,
      path: "/api/v1/auth/activate/verify",
    });
  }

  private clearEmailVerificationAttemptCookie(response: Response): void {
    response.clearCookie(EMAIL_VERIFICATION_ATTEMPT_COOKIE_NAME, {
      httpOnly: true,
      secure: this.configService.get<string>("NODE_ENV") === "production",
      sameSite: "lax",
      path: "/api/v1/auth/activate/verify",
    });
  }

  private setPasswordActivationAttemptCookie(
    response: Response,
    token: string,
  ): void {
    response.cookie(PASSWORD_ACTIVATION_ATTEMPT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.configService.get<string>("NODE_ENV") === "production",
      sameSite: "lax",
      maxAge: EMAIL_VERIFICATION_ATTEMPT_EXPIRES_IN_SECONDS * 1000,
      path: "/api/v1/auth/activate/password",
    });
  }

  private clearPasswordActivationAttemptCookie(response: Response): void {
    response.clearCookie(PASSWORD_ACTIVATION_ATTEMPT_COOKIE_NAME, {
      httpOnly: true,
      secure: this.configService.get<string>("NODE_ENV") === "production",
      sameSite: "lax",
      path: "/api/v1/auth/activate/password",
    });
  }
}
