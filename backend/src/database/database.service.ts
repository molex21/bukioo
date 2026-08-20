import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, QueryResult, QueryResultRow } from "pg";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    const connectionString = this.configService.get<string>("DATABASE_URL");

    if (!connectionString) {
      throw new Error(
        "DATABASE_URL no está definida en las variables de entorno",
      );
    }

    this.pool = new Pool({
      connectionString,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.pool.query("SELECT 1");
    console.log("PostgreSQL conectado correctamente");
  }

  async query<T extends QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
