import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BusinessesModule } from "../businesses/businesses.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { SuperadminController } from "./superadmin.controller";
import { SuperadminGuard } from "./superadmin.guard";
import { SuperadminRepository } from "./superadmin.repository";
import { SuperadminService } from "./superadmin.service";
import { PlatformEmployeesController } from "./platform-employees.controller";
import { PlatformEmployeesService } from "./platform-employees.service";

@Module({
  imports: [AuthModule, BusinessesModule, OrganizationsModule],
  controllers: [SuperadminController, PlatformEmployeesController],
  providers: [
    SuperadminRepository,
    SuperadminService,
    SuperadminGuard,
    PlatformEmployeesService,
  ],
})
export class SuperadminModule {}
