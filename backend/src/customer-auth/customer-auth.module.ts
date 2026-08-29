import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AppointmentsModule } from "../appointments/appointments.module";
import { CustomerAuthController } from "./customer-auth.controller";
import { CustomerJwtAuthGuard } from "./customer-jwt-auth.guard";
import { CustomerAuthRepository } from "./customer-auth.repository";
import { CustomerAuthService } from "./customer-auth.service";
@Module({
  imports: [AuthModule, AppointmentsModule],
  controllers: [CustomerAuthController],
  providers: [
    CustomerAuthService,
    CustomerAuthRepository,
    CustomerJwtAuthGuard,
  ],
  exports: [CustomerJwtAuthGuard],
})
export class CustomerAuthModule {}
