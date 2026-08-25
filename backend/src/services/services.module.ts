import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ServicesController } from "./services.controller";
import { ServicesRepository } from "./services.repository";
import { ServicesService } from "./services.service";

@Module({
  imports: [AuthModule],
  controllers: [ServicesController],
  providers: [ServicesService, ServicesRepository],
})
export class ServicesModule {}
