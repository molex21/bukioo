import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { EmployeesController } from "./employees.controller";
import { EmployeesRepository } from "./employees.repository";
import { EmployeesService } from "./employees.service";
import { TwoFactorRepository } from "../auth/two-factor.repository";

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesRepository, TwoFactorRepository],
})
export class EmployeesModule {}
