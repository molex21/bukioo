import { randomUUID } from "node:crypto";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types";
import { EmailProvider } from "../src/auth/email.provider";
import { OrganizationMembersRepository } from "../src/organizations/organization-members.repository";
import { OrganizationMembersService } from "../src/organizations/organization-members.service";

const databaseUrl = process.env.DATABASE_URL_TEST;
const isTestDatabase =
  databaseUrl && new URL(databaseUrl).pathname.endsWith("_test");
const run = isTestDatabase ? describe : describe.skip;

interface Roster {
  pagination: { limit: number; offset: number; total: number };
  items: Array<{
    membershipId: string;
    userId: string;
    role: string;
    businesses: Array<{
      id: string;
      hasAccess: boolean;
      employeeId: string | null;
    }>;
  }>;
}

run("Organization team HTTP and PostgreSQL", () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let jwt: JwtService;
  let org: string;
  let otherOrg: string;
  let business: string;
  let secondBusiness: string;
  let foreignBusiness: string;
  let users: string[];
  let owner: { id: string; membershipId: string; token: string };
  let admin: typeof owner;
  let employee: typeof owner;
  let platform: typeof owner;
  const sendActivation = jest.fn();
  const root = () => `/api/v1/organizations/${org}/members`;
  const platformRoot = () => `/api/v1/superadmin/organizations/${org}/members`;
  const http = () => request(app.getHttpServer());
  const transfer = (newOwnerMembershipId: string, token = platform.token) =>
    http()
      .post(`/api/v1/superadmin/organizations/${org}/transfer-ownership`)
      .auth(token, { type: "bearer" })
      .send({
        currentOwnerMembershipId: owner.membershipId,
        newOwnerMembershipId,
      });

  async function ownership() {
    const result = await pool.query<{ id: string; role: string }>(
      "SELECT id,role FROM organization_memberships WHERE organization_id=$1 ORDER BY id",
      [org],
    );
    return result.rows;
  }

  async function addUser(role: string, superadmin = false) {
    const id = randomUUID();
    users.push(id);
    await pool.query(
      "INSERT INTO users (id,email,password_hash,first_name,last_name,is_superadmin) VALUES ($1,$2,'hash',$3,'Team',$4)",
      [id, `${id}@example.test`, role, superadmin],
    );
    const member = await pool.query<{ id: string }>(
      "INSERT INTO organization_memberships (organization_id,user_id,role) VALUES ($1,$2,$3) RETURNING id",
      [org, id, role],
    );
    return {
      id,
      membershipId: member.rows[0].id,
      token: await jwt.signAsync({ sub: id }),
    };
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.NODE_ENV = "test";
    process.env.PGBOSS_ENABLED = "false";
    process.env.EMAIL_DELIVERY_ENABLED = "false";
    process.env.LOG_LEVEL = "silent";
    process.env.FRONTEND_URL = "http://localhost:5173";
    for (const name of [
      "JWT_ACCESS_SECRET",
      "JWT_REFRESH_SECRET",
      "JWT_EMAIL_VERIFICATION_SECRET",
      "TOTP_ENCRYPTION_KEY",
      "ONBOARDING_SECRET",
    ]) {
      process.env[name] = `test-only-${name}-must-have-at-least-32-characters`;
    }
    const { AppModule } =
      jest.requireActual<typeof import("../src/app.module")>(
        "../src/app.module",
      );
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailProvider)
      .useValue({ sendAccountCredentials: sendActivation })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwt = module.get(JwtService);
    pool = new Pool({ connectionString: databaseUrl });
  }, 30000);

  beforeEach(async () => {
    users = [];
    sendActivation.mockClear();
    org = randomUUID();
    otherOrg = randomUUID();
    business = randomUUID();
    secondBusiness = randomUUID();
    foreignBusiness = randomUUID();
    for (const id of [org, otherOrg]) {
      await pool.query(
        "INSERT INTO organizations (id,name,slug,email) VALUES ($1::uuid,'Team test',$1::uuid::text,'team@example.test')",
        [id],
      );
    }
    for (const [id, organizationId] of [
      [business, org],
      [secondBusiness, org],
      [foreignBusiness, otherOrg],
    ]) {
      await pool.query(
        "INSERT INTO businesses (id,organization_id,name,slug) VALUES ($1::uuid,$2,'Team business',$1::uuid::text)",
        [id, organizationId],
      );
    }
    owner = await addUser("OWNER");
    admin = await addUser("ADMIN");
    employee = await addUser("EMPLOYEE");
    platform = await addUser("MANAGER", true);
    await pool.query(
      "INSERT INTO business_memberships (organization_id,business_id,user_id) VALUES ($1,$2,$3)",
      [org, business, employee.id],
    );
  });

  afterEach(async () => {
    // Only remove fixtures created by this test, never truncate existing data.
    if (!pool || !users) return;
    await pool.query(
      "DELETE FROM platform_audit_logs WHERE actor_user_id = ANY($1::uuid[])",
      [users],
    );
    await pool.query(
      "DELETE FROM audit_logs WHERE organization_id = ANY($1::uuid[])",
      [[org, otherOrg]],
    );
    await pool.query("DELETE FROM organizations WHERE id = ANY($1::uuid[])", [
      [org, otherOrg],
    ]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [users]);
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
  });

  it("transfers ownership only through superadmin and preserves account/profile data", async () => {
    await http()
      .post(`/api/v1/businesses/${business}/employees`)
      .auth(owner.token, { type: "bearer" })
      .send({ userId: employee.id })
      .expect(201);
    const profilesBefore = await pool.query(
      "SELECT * FROM employees WHERE organization_id=$1 ORDER BY id",
      [org],
    );
    const usersBefore = await pool.query(
      "SELECT * FROM users WHERE id=ANY($1::uuid[]) ORDER BY id",
      [users],
    );
    // Platform authority must not require a membership in the tenant.
    await pool.query("DELETE FROM organization_memberships WHERE id=$1", [
      platform.membershipId,
    ]);
    await http()
      .post(`/api/v1/superadmin/organizations/${org}/transfer-ownership`)
      .send({})
      .expect(401);
    for (const token of [owner.token, admin.token, employee.token]) {
      await transfer(employee.membershipId, token).expect(403);
    }
    const result: { body: unknown } = await transfer(
      employee.membershipId,
    ).expect(200);
    expect(result.body).toEqual({
      organizationId: org,
      previousOwner: {
        membershipId: owner.membershipId,
        userId: owner.id,
        role: "ADMIN",
      },
      newOwner: {
        membershipId: employee.membershipId,
        userId: employee.id,
        role: "OWNER",
      },
    });
    expect((await ownership()).filter((row) => row.role === "OWNER")).toEqual([
      { id: employee.membershipId, role: "OWNER" },
    ]);
    expect(
      (
        await pool.query(
          "SELECT * FROM employees WHERE organization_id=$1 ORDER BY id",
          [org],
        )
      ).rows,
    ).toEqual(profilesBefore.rows);
    expect(
      (
        await pool.query(
          "SELECT * FROM users WHERE id=ANY($1::uuid[]) ORDER BY id",
          [users],
        )
      ).rows,
    ).toEqual(usersBefore.rows);
    expect(sendActivation).not.toHaveBeenCalled();
    const audit = await pool.query<{
      actor_user_id: string;
      new_values: unknown;
    }>(
      "SELECT actor_user_id,new_values FROM audit_logs WHERE organization_id=$1 AND action='ORGANIZATION_OWNERSHIP_TRANSFERRED'",
      [org],
    );
    expect(audit.rows).toEqual([
      { actor_user_id: platform.id, new_values: result.body },
    ]);
    expect(
      (
        await pool.query(
          "SELECT id FROM platform_audit_logs WHERE entity_id=$1 AND action='ORGANIZATION_OWNERSHIP_TRANSFERRED'",
          [org],
        )
      ).rowCount,
    ).toBe(1);
    await http()
      .get(`/api/v1/businesses/${secondBusiness}`)
      .auth(employee.token, { type: "bearer" })
      .expect(200);
    await http()
      .get(`/api/v1/businesses/${secondBusiness}`)
      .auth(owner.token, { type: "bearer" })
      .expect(200);
    // New owner can manage admins immediately; former owner no longer can.
    await http()
      .patch(`${root()}/${admin.membershipId}/role`)
      .auth(owner.token, { type: "bearer" })
      .send({ role: "MANAGER", businessIds: [] })
      .expect(403);
    await http()
      .patch(`${root()}/${admin.membershipId}/role`)
      .auth(employee.token, { type: "bearer" })
      .send({ role: "MANAGER", businessIds: [] })
      .expect(200);
    await transfer(employee.membershipId).expect(409);
  });

  it("validates ownership UUIDs and rejects cross-tenant or ineligible recipients", async () => {
    const endpoint = `/api/v1/superadmin/organizations/${org}/transfer-ownership`;
    await http()
      .post(endpoint)
      .auth(platform.token, { type: "bearer" })
      .send({ newOwnerMembershipId: employee.membershipId })
      .expect(400);
    await http()
      .post(endpoint)
      .auth(platform.token, { type: "bearer" })
      .send({
        currentOwnerMembershipId: owner.membershipId,
        newOwnerMembershipId: employee.membershipId,
        role: "OWNER",
      })
      .expect(400);
    await transfer("invalid").expect(400);
    await transfer(owner.membershipId).expect(400);
    await http()
      .post("/api/v1/superadmin/organizations/invalid/transfer-ownership")
      .auth(platform.token, { type: "bearer" })
      .send({
        currentOwnerMembershipId: owner.membershipId,
        newOwnerMembershipId: employee.membershipId,
      })
      .expect(400);
    const foreign = await pool.query<{ id: string }>(
      "INSERT INTO organization_memberships (organization_id,user_id,role) VALUES ($1,$2,'EMPLOYEE') RETURNING id",
      [otherOrg, employee.id],
    );
    await transfer(foreign.rows[0].id).expect(404);
    await pool.query(
      "UPDATE organization_memberships SET status='SUSPENDED' WHERE id=$1",
      [employee.membershipId],
    );
    await transfer(employee.membershipId).expect(409);
    await pool.query(
      "UPDATE organization_memberships SET status='ACTIVE' WHERE id=$1",
      [employee.membershipId],
    );
    await pool.query("UPDATE users SET status='BLOCKED' WHERE id=$1", [
      employee.id,
    ]);
    await transfer(employee.membershipId).expect(409);
    expect(
      (await ownership()).find((row) => row.id === owner.membershipId)?.role,
    ).toBe("OWNER");
  });

  it("commits only one competing ownership transfer", async () => {
    const results = await Promise.all([
      transfer(employee.membershipId),
      transfer(admin.membershipId),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(
      (await ownership()).filter((row) => row.role === "OWNER"),
    ).toHaveLength(1);
    expect(
      (
        await pool.query(
          "SELECT id FROM audit_logs WHERE organization_id=$1 AND action='ORGANIZATION_OWNERSHIP_TRANSFERRED'",
          [org],
        )
      ).rowCount,
    ).toBe(1);
  });

  it("rolls back both roles and business assignments if auditing fails", async () => {
    const before = await ownership();
    const assignments = await pool.query(
      "SELECT * FROM business_memberships WHERE organization_id=$1 ORDER BY user_id,business_id",
      [org],
    );
    const repository = app.get<OrganizationMembersRepository>(
      OrganizationMembersRepository,
    );
    const spy = jest
      .spyOn(repository, "audit")
      .mockImplementation(async (...args) => {
        await OrganizationMembersRepository.prototype.audit(...args);
        throw new Error("simulated failure after audit writes");
      });
    try {
      await expect(
        app.get(OrganizationMembersService).transferOwnership(
          org,
          {
            currentOwnerMembershipId: owner.membershipId,
            newOwnerMembershipId: employee.membershipId,
          },
          platform.id,
        ),
      ).rejects.toThrow("simulated failure");
    } finally {
      spy.mockRestore();
    }
    expect(await ownership()).toEqual(before);
    expect(
      (
        await pool.query(
          "SELECT * FROM business_memberships WHERE organization_id=$1 ORDER BY user_id,business_id",
          [org],
        )
      ).rows,
    ).toEqual(assignments.rows);
    expect(
      (
        await pool.query("SELECT id FROM audit_logs WHERE organization_id=$1", [
          org,
        ])
      ).rowCount,
    ).toBe(0);
    expect(
      (
        await pool.query(
          "SELECT id FROM platform_audit_logs WHERE entity_id=$1",
          [org],
        )
      ).rowCount,
    ).toBe(0);
  });

  it("lists owners without employee profiles, filters and scopes assignments", async () => {
    const response: { body: Roster } = await http()
      .get(root())
      .auth(owner.token, { type: "bearer" })
      .expect(200);
    expect(response.body.pagination).toEqual({
      limit: 50,
      offset: 0,
      total: 4,
    });
    const ownerRow = response.body.items.find(
      (row) => row.userId === owner.id,
    )!;
    expect(ownerRow.businesses).toHaveLength(2);
    expect(
      ownerRow.businesses.every(
        (row) => row.hasAccess && row.employeeId === null,
      ),
    ).toBe(true);
    expect(
      response.body.items
        .find((row) => row.userId === employee.id)
        ?.businesses.map((row) => row.id),
    ).toEqual([business]);
    const filtered: { body: Roster } = await http()
      .get(platformRoot())
      .auth(platform.token, { type: "bearer" })
      .query({
        search: "employee",
        role: "EMPLOYEE",
        status: "ACTIVE",
        limit: 1,
        offset: 0,
      })
      .expect(200);
    expect(filtered.body.pagination.total).toBe(1);
    const page: { body: Roster } = await http()
      .get(root())
      .auth(owner.token, { type: "bearer" })
      .query({ businessId: secondBusiness, limit: 1, offset: 1 })
      .expect(200);
    expect(page.body.pagination.total).toBe(2);
    expect(page.body.items).toHaveLength(1);
    await http()
      .get(root())
      .auth(owner.token, { type: "bearer" })
      .query({ businessId: foreignBusiness })
      .expect(404);
    await http()
      .get(`/api/v1/organizations/${otherOrg}/members`)
      .auth(owner.token, { type: "bearer" })
      .expect(403);
  });

  it("enforces guards and UUID/query/body validation through HTTP", async () => {
    await http().get(root()).expect(401);
    await http()
      .get(root())
      .auth(employee.token, { type: "bearer" })
      .expect(403);
    await http()
      .get(platformRoot())
      .auth(admin.token, { type: "bearer" })
      .expect(403);
    await http()
      .get("/api/v1/organizations/not-a-uuid/members")
      .auth(owner.token, { type: "bearer" })
      .expect(400);
    await http()
      .get(root())
      .auth(owner.token, { type: "bearer" })
      .query({ limit: 101 })
      .expect(400);
    await http()
      .patch(`${root()}/${employee.membershipId}/role`)
      .auth(owner.token, { type: "bearer" })
      .send({ role: "OWNER" })
      .expect(400);
    await http()
      .patch(`${root()}/bad/role`)
      .auth(owner.token, { type: "bearer" })
      .send({ role: "EMPLOYEE" })
      .expect(400);
  });

  it("does not report effective business access for a suspended organization", async () => {
    await pool.query(
      "UPDATE organizations SET status='SUSPENDED' WHERE id=$1",
      [org],
    );
    const response: { body: Roster } = await http()
      .get(platformRoot())
      .auth(platform.token, { type: "bearer" })
      .expect(200);
    expect(
      response.body.items
        .flatMap((row) => row.businesses)
        .every((row) => !row.hasAccess),
    ).toBe(true);
    const filtered: { body: Roster } = await http()
      .get(platformRoot())
      .auth(platform.token, { type: "bearer" })
      .query({ businessId: business })
      .expect(200);
    expect(filtered.body.pagination.total).toBe(0);
    await http().get(root()).auth(owner.token, { type: "bearer" }).expect(409);
  });

  it("enforces the employee plan limit without partially creating a profile", async () => {
    await pool.query(
      "INSERT INTO organization_subscriptions (organization_id,plan_code,status) VALUES ($1,'free','ACTIVE')",
      [org],
    );
    const plan = await pool.query<{ max_employees: number }>(
      "SELECT max_employees FROM plans WHERE code='free'",
    );
    for (let i = 0; i < plan.rows[0].max_employees; i++) {
      await pool.query(
        "INSERT INTO employees (organization_id,business_id,first_name,last_name) VALUES ($1,$2,'Fixture','Employee')",
        [org, business],
      );
    }
    await http()
      .post(`/api/v1/businesses/${business}/employees`)
      .auth(owner.token, { type: "bearer" })
      .send({ userId: owner.id })
      .expect(409);
    const result = await pool.query(
      "SELECT id FROM employees WHERE user_id=$1",
      [owner.id],
    );
    expect(result.rowCount).toBe(0);
  });

  it("links an existing owner in two businesses without new accounts, email or role changes", async () => {
    const create = () =>
      http()
        .post(`/api/v1/businesses/${business}/employees`)
        .auth(owner.token, { type: "bearer" })
        .send({ userId: owner.id, color: "#123abc" });
    const responses = await Promise.all([create(), create()]);
    expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
    await http()
      .post(
        `/api/v1/superadmin/organizations/${org}/businesses/${secondBusiness}/employees`,
      )
      .auth(platform.token, { type: "bearer" })
      .send({ userId: owner.id })
      .expect(201);
    const profiles = await pool.query<{
      first_name: string;
      color: string;
      user_id: string;
    }>("SELECT first_name,color,user_id FROM employees WHERE user_id=$1", [
      owner.id,
    ]);
    expect(profiles.rowCount).toBe(2);
    expect(profiles.rows.every((row) => row.first_name === "OWNER")).toBe(true);
    expect(profiles.rows.some((row) => row.color === "#123ABC")).toBe(true);
    const roles = await pool.query<{ role: string }>(
      "SELECT role FROM organization_memberships WHERE id=$1",
      [owner.membershipId],
    );
    expect(roles.rows[0].role).toBe("OWNER");
    const audit = await pool.query(
      "SELECT id FROM audit_logs WHERE organization_id=$1 AND action='EMPLOYEE_LINKED'",
      [org],
    );
    expect(audit.rowCount).toBe(2);
    expect(sendActivation).not.toHaveBeenCalled();
  });

  it("rejects mixed account input, unavailable business access and archived duplicates", async () => {
    const post = (body: object) =>
      http()
        .post(`/api/v1/businesses/${secondBusiness}/employees`)
        .auth(owner.token, { type: "bearer" })
        .send(body);
    await post({ userId: employee.id }).expect(409);
    await post({ userId: owner.id, firstName: "Changed" }).expect(400);
    await post({ userId: randomUUID() }).expect(404);
    await post({ userId: owner.id }).expect(201);
    await pool.query(
      "UPDATE employees SET is_active=FALSE,archived_at=NOW() WHERE user_id=$1",
      [owner.id],
    );
    await post({ userId: owner.id }).expect(409);
    await http()
      .post(
        `/api/v1/superadmin/organizations/${org}/businesses/${foreignBusiness}/employees`,
      )
      .auth(platform.token, { type: "bearer" })
      .send({ userId: owner.id })
      .expect(404);
  });

  it("changes roles with explicit access on demotion and idempotent auditing", async () => {
    const patch = (id: string, body: object, token = owner.token) =>
      http()
        .patch(`${root()}/${id}/role`)
        .auth(token, { type: "bearer" })
        .send(body);
    await patch(employee.membershipId, { role: "ADMIN" }, admin.token).expect(
      403,
    );
    await patch(
      admin.membershipId,
      { role: "MANAGER", businessIds: [] },
      admin.token,
    ).expect(403);
    await patch(admin.membershipId, { role: "MANAGER" }).expect(400);
    await patch(admin.membershipId, {
      role: "MANAGER",
      businessIds: [foreignBusiness],
    }).expect(404);
    await patch(admin.membershipId, {
      role: "MANAGER",
      businessIds: [business],
    }).expect(200);
    await patch(admin.membershipId, {
      role: "MANAGER",
      businessIds: [business],
    }).expect(200);
    await http().get(root()).auth(admin.token, { type: "bearer" }).expect(403);
    await http()
      .get(`/api/v1/businesses/${business}`)
      .auth(admin.token, { type: "bearer" })
      .expect(200);
    await http()
      .get(`/api/v1/businesses/${secondBusiness}`)
      .auth(admin.token, { type: "bearer" })
      .expect(403);
    const audit = await pool.query(
      "SELECT id FROM audit_logs WHERE entity_id=$1 AND action='MEMBER_ROLE_CHANGED'",
      [admin.membershipId],
    );
    expect(audit.rowCount).toBe(1);
    await http()
      .patch(`${platformRoot()}/${owner.membershipId}/role`)
      .auth(platform.token, { type: "bearer" })
      .send({ role: "EMPLOYEE", businessIds: [] })
      .expect(409);
    await http()
      .patch(`${platformRoot()}/${employee.membershipId}/role`)
      .auth(platform.token, { type: "bearer" })
      .send({ role: "ADMIN" })
      .expect(200);
    const platformAudit = await pool.query(
      "SELECT id FROM platform_audit_logs WHERE entity_id=$1 AND action='MEMBER_ROLE_CHANGED'",
      [employee.membershipId],
    );
    expect(platformAudit.rowCount).toBe(1);
  });

  it("serializes simultaneous access changes and rejects stale frontend state", async () => {
    const change = (ids: string[]) =>
      http()
        .patch(`${root()}/${employee.membershipId}/businesses`)
        .auth(owner.token, { type: "bearer" })
        .send({
          businessIds: ids,
          expectedBusinessIds: [business],
          expectedRole: "EMPLOYEE",
        });
    const responses = await Promise.all([change([]), change([secondBusiness])]);
    expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
    await http()
      .patch(`${root()}/${employee.membershipId}/status`)
      .auth(owner.token, { type: "bearer" })
      .send({
        status: "SUSPENDED",
        expectedStatus: "ACTIVE",
        expectedRole: "EMPLOYEE",
      })
      .expect(200);
    await http()
      .get(`/api/v1/businesses/${business}`)
      .auth(employee.token, { type: "bearer" })
      .expect(403);
    await http()
      .patch(`${root()}/${employee.membershipId}/status`)
      .auth(owner.token, { type: "bearer" })
      .send({
        status: "ACTIVE",
        expectedStatus: "ACTIVE",
        expectedRole: "EMPLOYEE",
      })
      .expect(409);
  });
});
