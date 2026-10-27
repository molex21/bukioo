import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { SchedulingRepository } from "../src/scheduling/scheduling.repository";
import { SchedulingService } from "../src/scheduling/scheduling.service";
import type { DatabaseService } from "../src/database/database.service";
import { AvailabilityRepository } from "../src/availability/availability.repository";
import { AppointmentsRepository } from "../src/appointments/appointments.repository";
import { Test } from "@nestjs/testing";
import {
  ValidationPipe,
  type ExecutionContext,
  type INestApplication,
} from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types";
import { JwtAuthGuard } from "../src/auth/jwt-auth.guard";
import { SchedulingController } from "../src/scheduling/scheduling.controller";

const databaseUrl = process.env.DATABASE_URL_TEST;
const run =
  databaseUrl && new URL(databaseUrl).pathname.endsWith("_test")
    ? describe
    : describe.skip;
run("Scheduling PostgreSQL integration", () => {
  let pool: Pool,
    client: PoolClient,
    org: string,
    biz: string,
    emp: string,
    actor: string;
  beforeAll(() => {
    pool = new Pool({ connectionString: databaseUrl });
  });
  afterAll(async () => {
    await pool?.end();
  });
  beforeEach(async () => {
    client = await pool.connect();
    await client.query("BEGIN");
    org = randomUUID();
    biz = randomUUID();
    emp = randomUUID();
    actor = randomUUID();
    await client.query(
      "INSERT INTO organizations(id,name,slug,email) VALUES($1::uuid,'Scheduling test',$1::uuid::text,'scheduling@example.test')",
      [org],
    );
    await client.query(
      "INSERT INTO businesses(id,organization_id,name,slug,timezone) VALUES($1::uuid,$2,'Scheduling test',$1::uuid::text,'Europe/Madrid')",
      [biz, org],
    );
    await client.query(
      "INSERT INTO employees(id,organization_id,business_id,first_name,last_name) VALUES($1,$2,$3,'Test','Employee')",
      [emp, org, biz],
    );
    await client.query(
      "INSERT INTO users(id,email,password_hash,first_name,last_name) VALUES($1::uuid,$1::uuid::text||'@example.test','test-hash','Test','Owner')",
      [actor],
    );
    await client.query(
      "INSERT INTO organization_memberships(organization_id,user_id,role) VALUES($1,$2,'OWNER')",
      [org, actor],
    );
  });
  afterEach(async () => {
    await client.query("ROLLBACK");
    client.release();
  });
  const base = async () => {
    await client.query(
      "INSERT INTO employee_working_hours(organization_id,business_id,employee_id,day_of_week,start_time,end_time) VALUES($1,$2,$3,1,'09:00','17:00')",
      [org, biz, emp],
    );
  };
  const exception = async (day: string, spans: unknown[]) => {
    await client.query(
      "INSERT INTO employee_schedule_exceptions(organization_id,business_id,employee_id,work_date,spans) VALUES($1,$2,$3,$4,$5) ON CONFLICT(employee_id,work_date) DO UPDATE SET spans=EXCLUDED.spans",
      [org, biz, emp, day, JSON.stringify(spans)],
    );
  };
  const covers = async (start: string, end: string) =>
    (
      await client.query<{ ok: boolean }>(
        "SELECT scheduling_covers($1,$2,$3,$4,$5) AS ok",
        [org, biz, emp, start, end],
      )
    ).rows[0].ok;
  const service = () =>
    new SchedulingService(
      new SchedulingRepository({
        transaction: async (callback: (c: PoolClient) => Promise<unknown>) =>
          callback(client),
      } as DatabaseService),
    );

  it("preserves the weekly base and excludes contained pauses", async () => {
    await base();
    expect(
      await covers("2030-01-07T09:00:00+01:00", "2030-01-07T10:00:00+01:00"),
    ).toBe(true);
    await exception("2030-01-07", [
      { start: 540, end: 1020, pauses: [{ start: 600, end: 630 }] },
    ]);
    expect(
      await covers("2030-01-07T09:00:00+01:00", "2030-01-07T10:15:00+01:00"),
    ).toBe(false);
  });
  it("explicit rest overrides base and can be removed", async () => {
    await base();
    await exception("2030-01-07", []);
    expect(
      await covers("2030-01-07T09:00:00+01:00", "2030-01-07T10:00:00+01:00"),
    ).toBe(false);
    await client.query(
      "DELETE FROM employee_schedule_exceptions WHERE employee_id=$1",
      [emp],
    );
    expect(
      await covers("2030-01-07T09:00:00+01:00", "2030-01-07T10:00:00+01:00"),
    ).toBe(true);
  });
  it("a rest exception also overrides overnight carry from the previous day", async () => {
    await exception("2030-01-07", [{ start: 1320, end: 1560, pauses: [] }]);
    expect(
      await covers("2030-01-07T23:00:00+01:00", "2030-01-08T01:00:00+01:00"),
    ).toBe(true);
    await exception("2030-01-08", []);
    expect(
      await covers("2030-01-08T00:00:00+01:00", "2030-01-08T01:00:00+01:00"),
    ).toBe(false);
  });
  it("rotates weeks using a snapshot and a per-employee phase", async () => {
    const p = Array.from({ length: 2 }, () =>
      Array.from({ length: 7 }, () => [] as unknown[]),
    );
    p[0][1] = [{ start: 540, end: 780, pauses: [] }];
    p[1][1] = [{ start: 960, end: 1200, pauses: [] }];
    await client.query(
      "INSERT INTO employee_shift_assignments(organization_id,business_id,employee_id,pattern_snapshot,anchor_date,phase_weeks,valid_from) VALUES($1,$2,$3,$4,'2030-01-07',1,'2030-01-07')",
      [org, biz, emp, JSON.stringify(p)],
    );
    expect(
      await covers("2030-01-07T16:00:00+01:00", "2030-01-07T17:00:00+01:00"),
    ).toBe(true);
    expect(
      await covers("2030-01-14T09:00:00+01:00", "2030-01-14T10:00:00+01:00"),
    ).toBe(true);
  });
  it("rejects ambiguous/nonexistent wall clocks and counts a 25-hour day", async () => {
    const result = await client.query<{
      spring: Date | null;
      autumn: Date | null;
      minutes: string;
    }>(`SELECT scheduling_instant('2026-03-29 02:30','Europe/Madrid') AS spring,
      scheduling_instant('2026-10-25 02:30','Europe/Madrid') AS autumn,
      extract(epoch FROM scheduling_instant('2026-10-26 00:00','Europe/Madrid')-scheduling_instant('2026-10-25 00:00','Europe/Madrid'))/60 AS minutes`);
    expect(result.rows[0].spring).toBeNull();
    expect(result.rows[0].autumn).toBeNull();
    expect(Number(result.rows[0].minutes)).toBe(1500);
  });
  it("preview rolls back day changes and employee versions", async () => {
    const result = await service().change(
      biz,
      actor,
      {
        type: "day",
        employeeIds: [emp],
        expectedVersions: { [emp]: 0 },
        date: "2030-01-07",
        spans: [{ start: 540, end: 780 }],
      },
      true,
    );
    expect(result.ok).toBe(true);
    expect(
      (
        await client.query(
          "SELECT * FROM employee_schedule_exceptions WHERE employee_id=$1",
          [emp],
        )
      ).rowCount,
    ).toBe(0);
    expect(
      (
        await client.query(
          "SELECT * FROM employee_schedule_versions WHERE employee_id=$1",
          [emp],
        )
      ).rowCount,
    ).toBe(0);
  });
  it("rejects foreign employees and stale versions before writing", async () => {
    await expect(
      service().change(
        biz,
        actor,
        {
          type: "day",
          employeeIds: [randomUUID()],
          expectedVersions: {},
          date: "2030-01-07",
          spans: [],
        },
        false,
      ),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service().change(
        biz,
        actor,
        {
          type: "day",
          employeeIds: [emp],
          expectedVersions: { [emp]: 99 },
          date: "2030-01-07",
          spans: [],
        },
        false,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("quadrant uses the same effective day function", async () => {
    await exception("2030-01-07", [
      { start: 540, end: 780, pauses: [{ start: 600, end: 615 }] },
    ]);
    const result = await service().quadrant(
      biz,
      actor,
      "2030-01-07",
      "2030-01-07",
    );
    expect(result.days[0]).toMatchObject({
      origin: "exception",
      presenceMinutes: "240.0000000000000000",
      attentionMinutes: "225.0000000000000000",
    });
  });

  async function appointmentData() {
    const customer = randomUUID(),
      serviceId = randomUUID();
    await client.query(
      "INSERT INTO customers(id,organization_id,business_id,first_name,email,phone) VALUES($1,$2,$3,'Test','customer@example.test','600000000')",
      [customer, org, biz],
    );
    await client.query(
      "INSERT INTO services(id,organization_id,business_id,name,duration_minutes) VALUES($1,$2,$3,'Test service',60)",
      [serviceId, org, biz],
    );
    return { customer, serviceId };
  }
  const insertAppointment = (
    connection: PoolClient,
    customer: string,
    serviceId: string,
  ) =>
    connection.query(
      `INSERT INTO appointments(organization_id,business_id,reference_code,customer_id,employee_id,service_id,start_at,end_at,occupied_start_at,occupied_end_at,duration_minutes)
    VALUES($1,$2,'SCHED-TEST',$3,$4,$5,'2030-01-07 09:00+01','2030-01-07 10:00+01','2030-01-07 09:00+01','2030-01-07 10:00+01',60)`,
      [org, biz, customer, emp, serviceId],
    );

  it("rejects a day change invalidating an existing active appointment atomically", async () => {
    await base();
    const { customer, serviceId } = await appointmentData();
    await insertAppointment(client, customer, serviceId);
    await client.query("SET CONSTRAINTS ALL IMMEDIATE");
    const version = (
      await client.query<{ version: number }>(
        "SELECT version FROM employee_schedule_versions WHERE employee_id=$1",
        [emp],
      )
    ).rows[0].version;
    await expect(
      service().change(
        biz,
        actor,
        {
          type: "day",
          employeeIds: [emp],
          expectedVersions: { [emp]: version },
          date: "2030-01-07",
          spans: [],
        },
        false,
      ),
    ).rejects.toMatchObject({ message: "scheduling_conflict" });
    expect(
      (
        await client.query(
          "SELECT * FROM employee_schedule_exceptions WHERE employee_id=$1",
          [emp],
        )
      ).rowCount,
    ).toBe(0);
    expect(await covers("2030-01-07T09:00+01", "2030-01-07T10:00+01")).toBe(
      true,
    );
  });
  it("copies a template and preserves the tail of an open assignment when replacing a finite range", async () => {
    const week = Array.from({ length: 7 }, () => [] as unknown[]);
    week[1] = [{ start: 540, end: 780 }];
    const template = await service().saveTemplate(biz, actor, {
      name: "Morning",
      pattern: [week],
    });
    await service().change(
      biz,
      actor,
      {
        type: "assignment",
        employeeIds: [emp],
        expectedVersions: { [emp]: 0 },
        templateId: template.id,
        templateVersion: template.version,
        from: "2030-01-07",
      },
      false,
    );
    await client.query("SET CONSTRAINTS ALL DEFERRED");
    const version = (
      await client.query<{ version: number }>(
        "SELECT version FROM employee_schedule_versions WHERE employee_id=$1",
        [emp],
      )
    ).rows[0].version;
    await service().change(
      biz,
      actor,
      {
        type: "assignment",
        employeeIds: [emp],
        expectedVersions: { [emp]: version },
        templateId: template.id,
        templateVersion: template.version,
        from: "2030-01-14",
        to: "2030-01-20",
      },
      false,
    );
    const ranges = (
      await client.query(
        "SELECT valid_from::text,valid_to::text FROM employee_shift_assignments WHERE employee_id=$1 ORDER BY valid_from",
        [emp],
      )
    ).rows;
    expect(ranges).toEqual([
      { valid_from: "2030-01-07", valid_to: "2030-01-13" },
      { valid_from: "2030-01-14", valid_to: "2030-01-20" },
      { valid_from: "2030-01-21", valid_to: null },
    ]);
  });
  it("does not grant scheduling management to an employee member", async () => {
    await client.query(
      "UPDATE organization_memberships SET role='EMPLOYEE' WHERE organization_id=$1 AND user_id=$2",
      [org, actor],
    );
    await expect(service().templates(biz, actor)).rejects.toMatchObject({
      status: 403,
    });
  });
  it("stores inclusive full-day permissions as local midnight intervals with actor and audit", async () => {
    const result = await service().change(
      biz,
      actor,
      {
        type: "absence",
        employeeIds: [emp],
        expectedVersions: { [emp]: 0 },
        from: "2030-01-07",
        to: "2030-01-08",
        fullDays: true,
        blockType: "PERMISSION",
        reason: "Private test note",
      },
      false,
    );
    expect(result.ok).toBe(true);
    const block = (
      await client.query<{ a: string; b: string; created_by_user_id: string }>(
        "SELECT (start_at AT TIME ZONE 'Europe/Madrid')::text AS a,(end_at AT TIME ZONE 'Europe/Madrid')::text AS b,created_by_user_id FROM calendar_blocks WHERE employee_id=$1",
        [emp],
      )
    ).rows[0];
    expect(block).toMatchObject({
      a: "2030-01-07 00:00:00",
      b: "2030-01-09 00:00:00",
      created_by_user_id: actor,
    });
    expect(
      (
        await client.query(
          "SELECT * FROM audit_logs WHERE business_id=$1 AND actor_user_id=$2 AND entity_id=$3",
          [biz, actor, emp],
        )
      ).rowCount,
    ).toBe(1);
  });
  it("HTTP validates command bodies, preserves preview and enforces tenant permissions", async () => {
    const module = await Test.createTestingModule({
      controllers: [SchedulingController],
      providers: [{ provide: SchedulingService, useValue: service() }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<{ userId: string }>().userId =
            actor;
          return true;
        },
      })
      .compile();
    const app: INestApplication<App> = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    try {
      const root = `/businesses/${biz}/scheduling`;
      await request(app.getHttpServer())
        .post(`${root}/preview`)
        .send({ command: "invalid" })
        .expect(400);
      const preview = await request(app.getHttpServer())
        .post(`${root}/preview`)
        .send({
          command: {
            type: "day",
            employeeIds: [emp],
            expectedVersions: { [emp]: 0 },
            date: "2030-01-07",
            spans: [{ start: 540, end: 780 }],
          },
        })
        .expect(201);
      expect(preview.body).toMatchObject({ ok: true, preview: true });
      await request(app.getHttpServer())
        .get(`${root}/quadrant?from=2030-01-07&to=2030-01-07`)
        .expect(200);
      await client.query(
        "UPDATE organization_memberships SET role='EMPLOYEE' WHERE organization_id=$1 AND user_id=$2",
        [org, actor],
      );
      await request(app.getHttpServer()).get(`${root}/templates`).expect(403);
    } finally {
      await app.close();
    }
  });
  it("availability and appointment validation consume the canonical schedule", async () => {
    const day = (
      await client.query<{ value: string }>(
        "SELECT ((now() AT TIME ZONE 'Europe/Madrid')::date+1)::text AS value",
      )
    ).rows[0].value;
    await exception(day, [
      { start: 540, end: 780, pauses: [{ start: 600, end: 615 }] },
    ]);
    const query = {
      query: (text: string, params: unknown[]) => client.query(text, params),
    } as DatabaseService;
    const context = {
      organization_id: org,
      business_id: biz,
      employee_id: emp,
      service_id: randomUUID(),
      timezone: "Europe/Madrid",
      duration_minutes: 30,
      buffer_before_minutes: 0,
      buffer_after_minutes: 0,
      minimum_booking_notice_minutes: 0,
      maximum_booking_advance_days: 31,
      same_day_booking: true,
      slot_interval_minutes: 15,
    };
    const bounds = (
      await client.query<{ a: Date; b: Date }>(
        "SELECT scheduling_instant($1::date::timestamp,'Europe/Madrid') AS a,scheduling_instant(($1::date+1)::timestamp,'Europe/Madrid') AS b",
        [day],
      )
    ).rows[0];
    const slots = await new AvailabilityRepository(query).listSlots(
      context,
      bounds.a,
      bounds.b,
    );
    expect(slots.length).toBeGreaterThan(0);
    const appointmentRepository = new AppointmentsRepository(query);
    for (const slot of slots)
      expect(
        await appointmentRepository.isWithinWorkingHours(
          context as Parameters<
            typeof appointmentRepository.isWithinWorkingHours
          >[0],
          slot.startAt,
          slot.endAt,
        ),
      ).toBe(true);
  });
  it("a concurrent appointment waits for the schedule lock and cannot reserve a day made free", async () => {
    await base();
    const { customer, serviceId } = await appointmentData();
    await client.query("COMMIT");
    await client.query("BEGIN");
    await exception("2030-01-07", []);
    const other = await pool.connect();
    try {
      await other.query("BEGIN");
      const pid = (
        await other.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")
      ).rows[0].pid;
      const insert = insertAppointment(other, customer, serviceId);
      let blocked = false;
      for (let i = 0; i < 50; i++) {
        if (
          (
            await client.query<{ waiting: boolean }>(
              "SELECT cardinality(pg_blocking_pids($1))>0 AS waiting",
              [pid],
            )
          ).rows[0].waiting
        ) {
          blocked = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(blocked).toBe(true);
      await client.query("COMMIT");
      await insert;
      await expect(other.query("COMMIT")).rejects.toMatchObject({
        message: "scheduling_conflict",
      });
    } finally {
      await other.query("ROLLBACK");
      other.release();
    }
  });
});
