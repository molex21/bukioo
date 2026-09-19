import {
  Body,
  Controller,
  Headers,
  Header,
  HttpCode,
  HttpStatus,
  Ip,
  Get,
  Patch,
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
  TWO_FACTOR_ATTEMPT_COOKIE_NAME,
  EMAIL_VERIFICATION_ATTEMPT_EXPIRES_IN_SECONDS,
  TWO_FACTOR_ATTEMPT_EXPIRES_IN_SECONDS,
  REFRESH_TOKEN_EXPIRES_IN_SECONDS,
} from "./auth.constants";
import { LoginDto } from "./dto/login.dto";
import { OnboardDto } from "./dto/onboard.dto";
import { RequestEmailVerificationDto } from "./dto/request-email-verification.dto";
import { RegisterDto } from "./dto/register.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { SetInitialPasswordDto } from "./dto/set-initial-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyPasswordResetDto } from "./dto/verify-password-reset.dto";
import { VerifyTwoFactorDto } from "./dto/verify-two-factor.dto";
import { UpdateMyProfileDto } from "./dto/update-my-profile.dto";
import { RequestEmailChangeDto } from "./dto/request-email-change.dto";
import { ConfirmEmailChangeDto } from "./dto/confirm-email-change.dto";
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

    if (
      "verificationAttemptToken" in loginResult &&
      loginResult.verificationAttemptToken
    ) {
      this.setEmailVerificationAttemptCookie(
        response,
        loginResult.verificationAttemptToken,
      );
      response.status(HttpStatus.ACCEPTED);
      return { emailVerificationRequired: true };
    }

    if (
      "passwordActivationAttemptToken" in loginResult &&
      loginResult.passwordActivationAttemptToken
    ) {
      this.setPasswordActivationAttemptCookie(
        response,
        loginResult.passwordActivationAttemptToken,
      );
      response.status(HttpStatus.ACCEPTED);
      return { passwordChangeRequired: true };
    }

    if (
      "twoFactorAttemptToken" in loginResult &&
      loginResult.twoFactorAttemptToken
    ) {
      this.setTwoFactorAttemptCookie(
        response,
        loginResult.twoFactorAttemptToken,
      );
      response.status(HttpStatus.ACCEPTED);
      return {
        twoFactorRequired: true,
      };
    }

    if (!("refreshToken" in loginResult)) {
      throw new Error("Respuesta de login invalida");
    }

    const { refreshToken, ...loginResponse } = loginResult;

    this.setRefreshTokenCookie(response, refreshToken);

    return loginResponse;
  }

  @Post("refresh")
  async refresh(
    @Headers("cookie") cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
    @Headers("user-agent") userAgent: string | undefined,
    @Ip() ipAddress: string,
  ) {
    const token = this.getRefreshToken(cookieHeader);
    const refreshResult =
      userAgent || ipAddress
        ? await this.authService.refresh(token, { userAgent, ipAddress })
        : await this.authService.refresh(token);
    const { refreshToken, ...refreshResponse } = refreshResult;

    this.setRefreshTokenCookie(response, refreshToken);

    return refreshResponse;
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Headers("cookie") cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
    @Headers("user-agent") userAgent: string | undefined,
    @Ip() ipAddress: string,
  ): Promise<void> {
    const token = this.getRefreshToken(cookieHeader);
    if (userAgent || ipAddress) {
      await this.authService.logout(token, { userAgent, ipAddress });
    } else {
      await this.authService.logout(token);
    }
    this.clearRefreshTokenCookie(response);
  }

  @Get("me")
  @Header("Cache-Control", "no-store")
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.me(request.userId!);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  updateMyProfile(
    @Body() updateMyProfileDto: UpdateMyProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.updateMyProfile(
      request.userId!,
      updateMyProfileDto,
    );
  }

  @Post("email/change/request")
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async requestEmailChange(
    @Body() input: RequestEmailChangeDto,
    @Req() request: AuthenticatedRequest,
    @Headers("user-agent") userAgent: string | undefined,
    @Ip() ipAddress: string,
  ) {
    await this.authService.requestEmailChange(request.userId!, input, {
      userAgent,
      ipAddress,
    });
    return { status: "accepted" };
  }

  @Post("email/change/confirm")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async confirmEmailChange(
    @Body() input: ConfirmEmailChangeDto,
    @Req() request: AuthenticatedRequest,
    @Headers("user-agent") userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.confirmEmailChange(
      request.userId!,
      input,
      { userAgent, ipAddress },
    );
    this.clearRefreshTokenCookie(response);
    return result;
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

  @Post("password/forgot")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async requestPasswordReset(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(forgotPasswordDto);
    return { status: "accepted" };
  }

  @Post("password/reset")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return { passwordReset: true };
  }

  @Post("password/reset/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async verifyPasswordResetCode(
    @Body() verifyPasswordResetDto: VerifyPasswordResetDto,
  ) {
    await this.authService.verifyPasswordResetCode(verifyPasswordResetDto);
    return { codeVerified: true };
  }

  @Post("2fa/setup")
  @UseGuards(JwtAuthGuard)
  setupTwoFactor(@Req() request: AuthenticatedRequest) {
    return this.authService.createTwoFactorSetup(request.userId!);
  }

  @Post("2fa/setup/verify")
  @UseGuards(JwtAuthGuard)
  verifyTwoFactorSetup(
    @Body() verifyTwoFactorDto: VerifyTwoFactorDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.enableTwoFactor(
      request.userId!,
      verifyTwoFactorDto,
    );
  }

  @Post("2fa/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async verifyTwoFactor(
    @Body() verifyTwoFactorDto: VerifyTwoFactorDto,
    @Headers("cookie") cookieHeader: string | undefined,
    @Headers("user-agent") userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...loginResponse } =
      await this.authService.verifyTwoFactor(
        verifyTwoFactorDto,
        this.getCookie(cookieHeader, TWO_FACTOR_ATTEMPT_COOKIE_NAME),
        { userAgent, ipAddress },
      );

    this.setRefreshTokenCookie(response, refreshToken);
    this.clearTwoFactorAttemptCookie(response);

    return loginResponse;
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

  private setTwoFactorAttemptCookie(response: Response, token: string): void {
    response.cookie(TWO_FACTOR_ATTEMPT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.configService.get<string>("NODE_ENV") === "production",
      sameSite: "lax",
      maxAge: TWO_FACTOR_ATTEMPT_EXPIRES_IN_SECONDS * 1000,
      path: "/api/v1/auth/2fa",
    });
  }

  private clearTwoFactorAttemptCookie(response: Response): void {
    response.clearCookie(TWO_FACTOR_ATTEMPT_COOKIE_NAME, {
      httpOnly: true,
      secure: this.configService.get<string>("NODE_ENV") === "production",
      sameSite: "lax",
      path: "/api/v1/auth/2fa",
    });
  }
}
