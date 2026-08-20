import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class HealthService {
  constructor(private readonly databaseService: DatabaseService) {}

  async check() {
    try {
      await this.databaseService.query("SELECT 1");

      return {
        status: "healthy",
        database: "connected",
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        database: "disconnected",
      });
    }
  }
}
