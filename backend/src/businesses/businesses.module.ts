import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BusinessesController } from "./businesses.controller";
import { BusinessesRepository } from "./businesses.repository";
import { BusinessesService } from "./businesses.service";

@Module({
  imports: [AuthModule],
  controllers: [BusinessesController],
  providers: [BusinessesService, BusinessesRepository],
  exports: [BusinessesRepository],
})
export class BusinessesModule {}
