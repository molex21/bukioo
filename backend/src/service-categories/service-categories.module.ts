import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ServiceCategoriesController } from "./service-categories.controller";
import { ServiceCategoriesRepository } from "./service-categories.repository";
import { ServiceCategoriesService } from "./service-categories.service";

@Module({
  imports: [AuthModule],
  controllers: [ServiceCategoriesController],
  providers: [ServiceCategoriesService, ServiceCategoriesRepository],
})
export class ServiceCategoriesModule {}
