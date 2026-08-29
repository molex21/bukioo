import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { CustomerAuthService } from "./customer-auth.service";
import { AppointmentsService } from "../appointments/appointments.service";
import { CustomerJwtAuthGuard } from "./customer-jwt-auth.guard";
import type { CustomerAuthenticatedRequest } from "./customer-jwt-auth.guard";
import { LoginCustomerDto } from "./dto/login-customer.dto";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
import { ListCustomerAppointmentsDto } from "../appointments/dto/list-customer-appointments.dto";
import { CancelAppointmentDto } from "../appointments/dto/cancel-appointment.dto";
@Controller("public/:organizationSlug/auth")
export class CustomerAuthController {
  constructor(
    private readonly service: CustomerAuthService,
    private readonly appointmentsService: AppointmentsService,
    private readonly config: ConfigService,
  ) {}
  @Post("register") async register(
    @Param("organizationSlug") slug: string,
    @Body() dto: RegisterCustomerDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...result } = await this.service.register(slug, dto);
    this.setRefreshTokenCookie(response, slug, refreshToken);
    response.status(HttpStatus.CREATED);
    return result;
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Param("organizationSlug") slug: string,
    @Body() dto: LoginCustomerDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...result } = await this.service.login(slug, dto);
    this.setRefreshTokenCookie(response, slug, refreshToken);
    return result;
  }

  @Post("refresh")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refresh(
    @Param("organizationSlug") slug: string,
    @Headers("cookie") cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { refreshToken, ...result } = await this.service.refresh(
      slug,
      this.getRefreshToken(cookieHeader),
    );
    this.setRefreshTokenCookie(response, slug, refreshToken);
    return result;
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Param("organizationSlug") slug: string,
    @Headers("cookie") cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.service.logout(slug, this.getRefreshToken(cookieHeader));
    this.clearRefreshTokenCookie(response, slug);
  }

  @Get("me")
  @UseGuards(CustomerJwtAuthGuard)
  me(@Req() request: CustomerAuthenticatedRequest) {
    return this.service.me(
      request.customer!.organizationId,
      request.customer!.id,
    );
  }

  @Get("appointments")
  @UseGuards(CustomerJwtAuthGuard)
  appointments(
    @Query() filters: ListCustomerAppointmentsDto,
    @Req() request: CustomerAuthenticatedRequest,
  ) {
    return this.appointmentsService.listForCustomerAccount(
      request.customer!.organizationId,
      request.customer!.id,
      filters,
    );
  }

  @Get("appointments/:appointmentId")
  @UseGuards(CustomerJwtAuthGuard)
  appointment(
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @Req() request: CustomerAuthenticatedRequest,
  ) {
    return this.appointmentsService.getForCustomerAccount(
      request.customer!.organizationId,
      request.customer!.id,
      appointmentId,
    );
  }

  @Post("appointments/:appointmentId/cancel")
  @UseGuards(CustomerJwtAuthGuard)
  cancelAppointment(
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @Body() dto: CancelAppointmentDto,
    @Req() request: CustomerAuthenticatedRequest,
  ) {
    return this.appointmentsService.cancelForCustomerAccount(
      request.customer!.organizationId,
      request.customer!.id,
      appointmentId,
      dto.reason,
    );
  }

  private getRefreshToken(cookieHeader: string | undefined) {
    const cookie = cookieHeader
      ?.split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("customer_refresh_token="));
    return cookie?.slice("customer_refresh_token=".length);
  }

  private setRefreshTokenCookie(
    response: Response,
    slug: string,
    refreshToken: string,
  ): void {
    response.cookie("customer_refresh_token", refreshToken, {
      httpOnly: true,
      secure: this.config.get<string>("NODE_ENV") === "production",
      sameSite: "lax",
      path: `/api/v1/public/${slug}/auth`,
      maxAge: 2592000000,
    });
  }

  private clearRefreshTokenCookie(response: Response, slug: string): void {
    response.clearCookie("customer_refresh_token", {
      httpOnly: true,
      secure: this.config.get<string>("NODE_ENV") === "production",
      sameSite: "lax",
      path: `/api/v1/public/${slug}/auth`,
    });
  }
}
