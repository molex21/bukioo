import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsRepository } from "./organizations.repository";
import { OrganizationsService } from "./organizations.service";
import { OrganizationMembersRepository } from "./organization-members.repository";
import { OrganizationMembersService } from "./organization-members.service";

@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationsRepository,
    OrganizationMembersRepository,
    OrganizationMembersService,
  ],
  exports: [OrganizationMembersService],
})
export class OrganizationsModule {}
