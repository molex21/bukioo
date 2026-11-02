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
  const version = async () =>
    (
      await client.query<{ version: number }>(
        "SELECT coalesce((SELECT version FROM employee_schedule_versions WHERE employee_id=$1),0) AS version",
        [emp],
      )
    ).rows[0].version;
  it("previews the actual restored base without deleting the exception", async () => {
    await base();
    await exception("2030-01-07", []);
    const preview = await service().change(
      biz,
      actor,
      {
        type: "resetDay",
        date: "2030-01-07",
        employeeIds: [emp],
        expectedVersions: { [emp]: await version() },
      },
      true,
    );
    expect(preview.restoredDay).toMatchObject({
      origin: "base",
      spans: [{ start: 540, end: 1020, pauses: [] }],
    });
    expect(await covers("2030-01-07T09:00+01", "2030-01-07T10:00+01")).toBe(
      false,
    );
  });
  it("stores daily templates separately and refuses to assign them as rotations", async () => {
    const week = Array.from({ length: 7 }, () => [] as unknown[]);
    week[0] = [
      { start: 1320, end: 1560, pauses: [{ start: 1410, end: 1440 }] },
    ];
    const template = await service().saveTemplate(biz, actor, {
      name: "Noche",
      kind: "DAY",
      pattern: [week],
    });
    expect(template.kind).toBe("DAY");
    await expect(
      service().change(
        biz,
        actor,
        {
          type: "assignment",
          from: "2030-01-07",
          employeeIds: [emp],
          expectedVersions: { [emp]: 0 },
          templateId: template.id,
          templateVersion: template.version,
        },
        false,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("applies one daily shift to arbitrary dates without recurrence", async () => {
    await service().change(
      biz,
      actor,
      {
        type: "days",
        date: "2030-01-07",
        dates: ["2030-01-07", "2030-01-09"],
        employeeIds: [emp],
        expectedVersions: { [emp]: 0 },
        spans: [{ start: 540, end: 780 }],
      },
      false,
    );
    expect(await covers("2030-01-09T09:00+01", "2030-01-09T10:00+01")).toBe(
      true,
    );
    expect(await covers("2030-01-14T09:00+01", "2030-01-14T10:00+01")).toBe(
      false,
    );
  });
  it("rolls back all selected dates when one affects an appointment", async () => {
    await base();
    const { customer, serviceId } = await appointmentData();
    await insertAppointment(client, customer, serviceId);
    const result = await service().change(
      biz,
      actor,
      {
        type: "days",
        date: "2030-01-07",
        dates: ["2030-01-07", "2030-01-09"],
        employeeIds: [emp],
        expectedVersions: { [emp]: await version() },
        spans: [],
      },
      true,
    );
    expect(result.ok).toBe(false);
    expect(
      (
        await client.query(
          "SELECT 1 FROM employee_schedule_exceptions WHERE employee_id=$1",
          [emp],
        )
      ).rowCount,
    ).toBe(0);
  });
  it("keeps past base hours and later scheduled weeks, with pauses and overnight shifts", async () => {
    await base();
    const week = Array.from({ length: 7 }, () => [] as unknown[]);
    week[1] = [
      { start: 1320, end: 1560, pauses: [{ start: 1380, end: 1410 }] },
    ];
    const command = {
      type: "weekly",
      from: "2030-01-07",
      week,
      employeeIds: [emp],
      expectedVersions: { [emp]: await version() },
    };
    await service().change(biz, actor, command, false);
    expect(await covers("2029-12-31T09:00+01", "2029-12-31T10:00+01")).toBe(
      true,
    );
    expect(await covers("2030-01-07T23:00+01", "2030-01-07T23:15+01")).toBe(
      false,
    );
    expect(await covers("2030-01-08T00:00+01", "2030-01-08T01:00+01")).toBe(
      true,
    );
    await service().change(
      biz,
      actor,
      {
        ...command,
        from: "2030-02-04",
        week: Array.from({ length: 7 }, () => []),
        expectedVersions: { [emp]: await version() },
      },
      false,
    );
    const loaded = await service().weeklyBase(biz, actor, emp, "2030-01-07");
    expect(loaded.nextDate).toBe("2030-02-04");
    expect(loaded.week).toEqual(
      week.map((d) => d.map((s) => ({ ...(s as object) }))),
    );
    expect(await covers("2030-02-04T22:00+01", "2030-02-04T23:00+01")).toBe(
      false,
    );
  });

  async function reassignmentFixture() {
    await base();
    const { customer, serviceId } = await appointmentData();
    const target = randomUUID();
    await client.query(
      "INSERT INTO employees(id,organization_id,business_id,first_name,last_name) VALUES($1,$2,$3,'Other','Employee')",
      [target, org, biz],
    );
    await client.query(
      "INSERT INTO employee_services(organization_id,business_id,employee_id,service_id) VALUES($1,$2,$3,$4)",
      [org, biz, target, serviceId],
    );
    await client.query(
      "INSERT INTO employee_working_hours(organization_id,business_id,employee_id,day_of_week,start_time,end_time) VALUES($1,$2,$3,1,'09:00','17:00')",
      [org, biz, target],
    );
    await insertAppointment(client, customer, serviceId);
    const appointmentId = (
      await client.query<{ id: string }>(
        "SELECT id FROM appointments WHERE business_id=$1",
        [biz],
      )
    ).rows[0].id;
    await client.query(
      "UPDATE appointments SET conflict_override=TRUE WHERE id=$1",
      [appointmentId],
    );
    await client.query("SET CONSTRAINTS ALL IMMEDIATE");
    const options = await service().reassignmentOptions(
      biz,
      actor,
      appointmentId,
    );
    const reassignment = {
      appointmentId,
      employeeId: target,
      expectedEmployeeId: options.expectedEmployeeId,
      expectedUpdatedAt: options.expectedUpdatedAt,
    };
    const command = {
      type: "day",
      date: "2030-01-07",
      spans: [],
      employeeIds: [emp],
      expectedVersions: { [emp]: await version() },
      reassignments: [reassignment],
    };
    return { target, appointmentId, options, command };
  }
  it("previews and saves a reassignment and the schedule together without changing appointment snapshots", async () => {
    const { target, appointmentId, options, command } =
      await reassignmentFixture();
    expect(options.employees).toContainEqual(
      expect.objectContaining({ id: target }),
    );
    const before = (
      await client.query<Record<string, unknown>>(
        "SELECT * FROM appointments WHERE id=$1",
        [appointmentId],
      )
    ).rows[0];
    expect((await service().change(biz, actor, command, true)).ok).toBe(true);
    expect(
      (
        await client.query<{ employee_id: string }>(
          "SELECT employee_id FROM appointments WHERE id=$1",
          [appointmentId],
        )
      ).rows[0].employee_id,
    ).toBe(emp);
    await service().change(biz, actor, command, false);
    const after = (
      await client.query<Record<string, unknown>>(
        "SELECT * FROM appointments WHERE id=$1",
        [appointmentId],
      )
    ).rows[0];
    expect(after.employee_id).toBe(target);
    expect(after.conflict_override).toBe(false);
    for (const field of [
      "start_at",
      "end_at",
      "price_amount",
      "duration_minutes",
      "status",
      "service_id",
    ])
      expect(after[field]).toEqual(before[field]);
    expect(await covers("2030-01-07T09:00+01", "2030-01-07T10:00+01")).toBe(
      false,
    );
  });
  it("rejects stale appointments and rolls back the schedule", async () => {
    const { appointmentId, command } = await reassignmentFixture();
    await client.query(
      "UPDATE appointments SET status='CANCELLED' WHERE id=$1",
      [appointmentId],
    );
    await expect(
      service().change(biz, actor, command, false),
    ).rejects.toMatchObject({ status: 409 });
    expect(await covers("2030-01-07T09:00+01", "2030-01-07T10:00+01")).toBe(
      true,
    );
    expect(
      (
        await client.query<{ employee_id: string }>(
          "SELECT employee_id FROM appointments WHERE id=$1",
          [appointmentId],
        )
      ).rows[0].employee_id,
    ).toBe(emp);
  });
  it("rejects a destination that loses its service assignment", async () => {
    const { target, command } = await reassignmentFixture();
    await client.query("DELETE FROM employee_services WHERE employee_id=$1", [
      target,
    ]);
    await expect(
      service().change(biz, actor, command, false),
    ).rejects.toMatchObject({ status: 409 });
    expect(await covers("2030-01-07T09:00+01", "2030-01-07T10:00+01")).toBe(
      true,
    );
  });
  it("rejects a destination blocked after candidates were loaded", async () => {
    const { target, command } = await reassignmentFixture();
    await client.query(
      "INSERT INTO calendar_blocks(organization_id,business_id,employee_id,type,start_at,end_at) VALUES($1,$2,$3,'VACATION','2030-01-07 08:00+01','2030-01-07 18:00+01')",
      [org, biz, target],
    );
    await expect(
      service().change(biz, actor, command, false),
    ).rejects.toMatchObject({ status: 409 });
    expect(await covers("2030-01-07T09:00+01", "2030-01-07T10:00+01")).toBe(
      true,
    );
  });
  it("rejects overlaps instead of leaving the reassigned appointment pending", async () => {
    const { target, appointmentId, command } = await reassignmentFixture();
    await client.query(
      `INSERT INTO appointments(organization_id,business_id,reference_code,customer_id,employee_id,service_id,start_at,end_at,occupied_start_at,occupied_end_at,duration_minutes)
      SELECT organization_id,business_id,'SCHED-OTHER',customer_id,$2,service_id,start_at,end_at,occupied_start_at,occupied_end_at,duration_minutes FROM appointments WHERE id=$1`,
      [appointmentId, target],
    );
    await expect(
      service().change(biz, actor, command, false),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (
        await client.query<{ employee_id: string }>(
          "SELECT employee_id FROM appointments WHERE id=$1",
          [appointmentId],
        )
      ).rows[0].employee_id,
    ).toBe(emp);
  });
  it("checks buffers when listing replacement employees", async () => {
    const { appointmentId, target } = await reassignmentFixture();
    await client.query(
      "UPDATE employee_working_hours SET start_time='08:00' WHERE employee_id=$1",
      [emp],
    );
    await client.query(
      "UPDATE appointments SET occupied_start_at=start_at-interval '15 minutes',buffer_before_minutes=15 WHERE id=$1",
      [appointmentId],
    );
    const options = await service().reassignmentOptions(
      biz,
      actor,
      appointmentId,
    );
    expect(options.employees.some((e) => e.id === target)).toBe(false);
  });
  it("rejects a foreign destination and a foreign appointment without changing either resource", async () => {
    const { command } = await reassignmentFixture();
    await expect(
      service().change(
        biz,
        actor,
        {
          ...command,
          reassignments: [
            { ...command.reassignments[0], employeeId: randomUUID() },
          ],
        },
        false,
      ),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service().reassignmentOptions(biz, actor, randomUUID()),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service().weeklyBase(biz, randomUUID(), emp, "2030-01-07"),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service().reassignmentOptions(
        biz,
        randomUUID(),
        command.reassignments[0].appointmentId,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("preserves dated legacy hours instead of silently freezing future changes", async () => {
    await client.query(
      "INSERT INTO employee_working_hours(organization_id,business_id,employee_id,day_of_week,start_time,end_time,valid_from,valid_to) VALUES($1,$2,$3,1,'09:00','17:00','2030-01-01','2030-02-01')",
      [org, biz, emp],
    );
    await expect(
      service().weeklyBase(biz, actor, emp, "2030-01-07"),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service().change(
        biz,
        actor,
        {
          type: "weekly",
          from: "2030-01-07",
          week: Array.from({ length: 7 }, () => []),
          employeeIds: [emp],
          expectedVersions: { [emp]: await version() },
        },
        false,
      ),
    ).rejects.toMatchObject({ status: 409 });
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
      await request(app.getHttpServer())
        .get(`${root}/weekly-base/${emp}`)
        .expect(403);
      await request(app.getHttpServer())
        .get(`${root}/reassignment-options/${randomUUID()}`)
        .expect(403);
    } finally {
      await app.close();
    }
  });
  it("paid pauses change work estimates but never appointment availability", async () => {
    const spans = [
      {
        start: 540,
        end: 1020,
        pauses: [{ start: 720, end: 750, countsAsWork: false }],
      },
    ];
    await exception("2030-01-07", spans);
    const work = async (day: string) =>
      (
        await client.query<{ minutes: string | null }>(
          "SELECT scheduling_work_minutes($1,$2,$3,$4) AS minutes",
          [org, biz, emp, day],
        )
      ).rows[0].minutes;
    expect(Number(await work("2030-01-07"))).toBe(450);
    expect(await covers("2030-01-07T12:00+01", "2030-01-07T12:15+01")).toBe(
      false,
    );
    spans[0].pauses[0].countsAsWork = true;
    await exception("2030-01-07", spans);
    expect(Number(await work("2030-01-07"))).toBe(480);
    expect(await covers("2030-01-07T12:00+01", "2030-01-07T12:15+01")).toBe(
      false,
    );
    const quadrant = await service().quadrant(
      biz,
      actor,
      "2030-01-07",
      "2030-01-07",
    );
    expect(Number(quadrant.days[0].workMinutes)).toBe(480);
  });
  it("preserves pause accounting through templates, bases, date batches and copied rotations", async () => {
    const shift = [
      {
        start: 540,
        end: 1020,
        pauses: [{ start: 720, end: 750, countsAsWork: true }],
      },
    ];
    const daily = Array.from({ length: 7 }, () => [] as unknown[]);
    daily[0] = shift;
    expect(
      (
        await service().saveTemplate(biz, actor, {
          kind: "DAY",
          name: "Paid break",
          pattern: [daily],
        })
      ).pattern,
    ).toEqual([daily]);
    const week = Array.from({ length: 7 }, () => [] as unknown[]);
    week[1] = shift;
    await service().change(
      biz,
      actor,
      {
        type: "weekly",
        from: "2030-01-07",
        week,
        employeeIds: [emp],
        expectedVersions: { [emp]: await version() },
      },
      false,
    );
    expect(
      (await service().weeklyBase(biz, actor, emp, "2030-01-07")).week,
    ).toEqual(week);
    await service().change(
      biz,
      actor,
      {
        type: "dates",
        date: "2030-01-08",
        entries: [
          { date: "2030-01-08", spans: shift },
          { date: "2030-01-10", spans: [] },
        ],
        employeeIds: [emp],
        expectedVersions: { [emp]: await version() },
      },
      false,
    );
    const stored = (
      await client.query<{ spans: unknown }>(
        "SELECT spans FROM employee_schedule_exceptions WHERE employee_id=$1 AND work_date='2030-01-08'",
        [emp],
      )
    ).rows[0];
    expect(stored.spans).toEqual(shift);
    const template = await service().saveTemplate(biz, actor, {
      kind: "CYCLE",
      name: "Paid rotation",
      pattern: [week],
    });
    await service().change(
      biz,
      actor,
      {
        type: "assignment",
        from: "2030-01-07",
        to: "2030-02-01",
        templateId: template.id,
        templateVersion: template.version,
        employeeIds: [emp],
        expectedVersions: { [emp]: await version() },
      },
      false,
    );
    expect(
      (
        await client.query<{ pattern_snapshot: unknown }>(
          "SELECT pattern_snapshot FROM employee_shift_assignments WHERE employee_id=$1",
          [emp],
        )
      ).rows[0].pattern_snapshot,
    ).toEqual([week]);
    const preview = await service().change(
      biz,
      actor,
      {
        type: "resetDay",
        date: "2030-01-07",
        employeeIds: [emp],
        expectedVersions: { [emp]: await version() },
      },
      true,
    );
    expect(preview.restoredDay).toMatchObject({ spans: shift });
  });
  it("uses actual DST duration and reports ambiguous estimates as unavailable", async () => {
    await exception("2030-03-31", [
      {
        start: 0,
        end: 240,
        pauses: [{ start: 60, end: 90, countsAsWork: true }],
      },
    ]);
    const work = async (day: string) =>
      (
        await client.query<{ minutes: string | null }>(
          "SELECT scheduling_work_minutes($1,$2,$3,$4) AS minutes",
          [org, biz, emp, day],
        )
      ).rows[0].minutes;
    expect(Number(await work("2030-03-31"))).toBe(180);
    await exception("2030-10-27", [{ start: 0, end: 240, pauses: [] }]);
    expect(Number(await work("2030-10-27"))).toBe(300);
    await exception("2030-10-27", [
      {
        start: 0,
        end: 240,
        pauses: [{ start: 135, end: 150, countsAsWork: true }],
      },
    ]);
    expect(await work("2030-10-27")).toBeNull();
  });
  it("splits an overnight pause by calendar date without double counting", async () => {
    await exception("2030-01-07", [
      { start: 1320, end: 1560, pauses: [{ start: 1410, end: 1470 }] },
    ]);
    const result = await service().quadrant(
      biz,
      actor,
      "2030-01-07",
      "2030-01-08",
    );
    expect(result.days.map((d) => Number(d.workMinutes))).toEqual([90, 90]);
  });
  it("clips the final rotation night and preserves the following base schedule", async () => {
    await client.query(
      "INSERT INTO employee_working_hours(organization_id,business_id,employee_id,day_of_week,start_time,end_time) VALUES($1,$2,$3,2,'09:00','17:00')",
      [org, biz, emp],
    );
    const week = Array.from({ length: 7 }, () => [] as unknown[]);
    week[1] = [{ start: 1320, end: 1560, pauses: [] }];
    const template = await service().saveTemplate(biz, actor, {
      kind: "CYCLE",
      name: "Night",
      pattern: [week],
    });
    const command = {
      type: "assignment",
      from: "2030-01-07",
      to: "2030-01-07",
      templateId: template.id,
      templateVersion: template.version,
      employeeIds: [emp],
      expectedVersions: { [emp]: await version() },
    };
    const preview = await service().change(biz, actor, command, true);
    expect(preview).toMatchObject({ ok: true, estimatedTotalMinutes: 120 });
    await service().change(biz, actor, command, false);
    expect(await covers("2030-01-08T00:00+01", "2030-01-08T01:00+01")).toBe(
      false,
    );
    expect(await covers("2030-01-08T09:00+01", "2030-01-08T10:00+01")).toBe(
      true,
    );
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
