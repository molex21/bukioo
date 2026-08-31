import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SuperadminController } from "./superadmin.controller";
import { SuperadminGuard } from "./superadmin.guard";
import { SuperadminRepository } from "./superadmin.repository";
import { SuperadminService } from "./superadmin.service";

@Module({
  imports: [AuthModule],
  controllers: [SuperadminController],
  providers: [SuperadminRepository, SuperadminService, SuperadminGuard],
})
export class SuperadminModule {}
