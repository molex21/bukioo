import { ConfigService } from "@nestjs/config";
import type { PgBoss } from "pg-boss";

export const PG_BOSS = Symbol("PG_BOSS");

export type PgBossClient = Pick<PgBoss, "start" | "stop" | "work" | "schedule">;

type PgBossModule = {
  PgBoss: new (connectionString: string) => PgBossClient;
};

type DynamicImporter = (modulePath: string) => Promise<unknown>;

export async function createPgBoss(
  configService: ConfigService,
): Promise<PgBossClient | null> {
  if (
    !configService.get<boolean>("PGBOSS_ENABLED") ||
    configService.get<string>("NODE_ENV") === "test"
  ) {
    return null;
  }

  // pg-boss v12 is ESM-only while the Nest build remains CommonJS.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const importEsm = Function(
    "modulePath",
    "return import(modulePath)",
  ) as unknown as DynamicImporter;
  const { PgBoss } = (await importEsm("pg-boss")) as PgBossModule;

  return new PgBoss(configService.getOrThrow<string>("DATABASE_URL"));
}
