import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_EXPIRES_IN_SECONDS,
} from "./auth.constants";
import { LoginDto } from "./dto/login.dto";
import { OnboardDto } from "./dto/onboard.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post("register")
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post("onboard")
  onboard(@Body() onboardDto: OnboardDto) {
    return this.authService.onboard(onboardDto);
  }

  @Post("login")
  async login(
    @Body() loginDto: LoginDto,
    @Headers("user-agent") userAgent: string | undefined,
    @Ip() ipAddress: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...loginResponse } = await this.authService.login(
      loginDto,
      { userAgent, ipAddress },
    );

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

  private getRefreshToken(
    cookieHeader: string | undefined,
  ): string | undefined {
    const refreshTokenCookie = cookieHeader
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`));

    return refreshTokenCookie?.slice(REFRESH_TOKEN_COOKIE_NAME.length + 1);
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
}
