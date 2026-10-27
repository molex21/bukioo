import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Pool } from "pg";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";

const databaseUrl = process.env.DATABASE_URL_TEST;
const runE2e =
  databaseUrl && /_test(?:[/?]|$)/.test(databaseUrl) ? describe : describe.skip;

runE2e("HTTP integration", () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let jwt: JwtService;

  async function createAppointmentFixture() {
    const user = await pool.query<{ id: string }>(
      "INSERT INTO users (email, password_hash) VALUES ('owner-booking@test.local', 'hash') RETURNING id",
    );
    const organization = await pool.query<{ id: string }>(
      "INSERT INTO organizations (name, slug, email, timezone) VALUES ('Booking Org', 'booking-org-test', 'booking@test.local', 'UTC') RETURNING id",
    );
    await pool.query(
      "INSERT INTO organization_settings (organization_id, auto_confirm_appointments) VALUES ($1, TRUE)",
      [organization.rows[0].id],
    );
    const business = await pool.query<{ id: string }>(
      "INSERT INTO businesses (organization_id, name, slug, timezone) VALUES ($1, 'Booking Business', 'booking-business-test', 'UTC') RETURNING id",
      [organization.rows[0].id],
    );
    await pool.query(
      "INSERT INTO organization_memberships (organization_id, user_id, role) VALUES ($1, $2, 'OWNER')",
      [organization.rows[0].id, user.rows[0].id],
    );
    const employee = await pool.query<{ id: string }>(
      "INSERT INTO employees (organization_id, business_id, first_name, last_name) VALUES ($1, $2, 'Test', 'Employee') RETURNING id",
      [organization.rows[0].id, business.rows[0].id],
    );
    const service = await pool.query<{ id: string }>(
      "INSERT INTO services (organization_id, business_id, name, duration_minutes, price) VALUES ($1, $2, 'Test service', 60, 20) RETURNING id",
      [organization.rows[0].id, business.rows[0].id],
    );
    const customer = await pool.query<{ id: string }>(
      "INSERT INTO customers (organization_id, business_id, first_name, email, phone) VALUES ($1, $2, 'Test customer', 'customer-booking@test.local', '600000000') RETURNING id",
      [organization.rows[0].id, business.rows[0].id],
    );
    await pool.query(
      "INSERT INTO employee_services (organization_id, business_id, employee_id, service_id) VALUES ($1, $2, $3, $4)",
      [
        organization.rows[0].id,
        business.rows[0].id,
        employee.rows[0].id,
        service.rows[0].id,
      ],
    );
    await pool.query(
      "INSERT INTO employee_working_hours (organization_id, business_id, employee_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, 1, '08:00', '18:00')",
      [organization.rows[0].id, business.rows[0].id, employee.rows[0].id],
    );
    await pool.query(
      "INSERT INTO business_loyalty_settings (business_id, organization_id) VALUES ($1, $2)",
      [business.rows[0].id, organization.rows[0].id],
    );
    return {
      businessId: business.rows[0].id,
      customerId: customer.rows[0].id,
      employeeId: employee.rows[0].id,
      serviceId: service.rows[0].id,
      token: await jwt.signAsync({ sub: user.rows[0].id }),
    };
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.NODE_ENV = "test";
    process.env.FRONTEND_URL = "http://localhost:5173";
    process.env.JWT_ACCESS_SECRET =
      "test-access-secret-must-have-at-least-32-characters";
    process.env.JWT_REFRESH_SECRET =
      "test-refresh-secret-must-have-at-least-32-characters";
    process.env.JWT_EMAIL_VERIFICATION_SECRET =
      "test-email-secret-must-have-at-least-32-characters";
    process.env.TOTP_ENCRYPTION_KEY =
      "test-totp-secret-must-have-at-least-32-characters";
    process.env.ONBOARDING_SECRET =
      "test-onboarding-secret-must-have-at-least-32-characters";
    process.env.PGBOSS_ENABLED = "false";
    process.env.EMAIL_DELIVERY_ENABLED = "false";
    pool = new Pool({ connectionString: databaseUrl });
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    jwt = moduleFixture.get(JwtService);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE TABLE users, organizations CASCADE");
  });

  it("returns the health check through the real HTTP stack", () => {
    return request(app.getHttpServer()).get("/health").expect(200);
  });

  it("isolates a regular user from the superadmin API", async () => {
    const user = await pool.query<{ id: string }>(
      "INSERT INTO users (email, password_hash) VALUES ('regular@test.local', 'hash') RETURNING id",
    );
    const token = await jwt.signAsync({ sub: user.rows[0].id });
    await request(app.getHttpServer())
      .get("/superadmin/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("does not expose a business from another organization", async () => {
    const user = await pool.query<{ id: string }>(
      "INSERT INTO users (email, password_hash) VALUES ('tenant@test.local', 'hash') RETURNING id",
    );
    const organizationA = await pool.query<{ id: string }>(
      "INSERT INTO organizations (name, slug, email) VALUES ('Organization A', 'organization-a-test', 'a@test.local') RETURNING id",
    );
    const organizationB = await pool.query<{ id: string }>(
      "INSERT INTO organizations (name, slug, email) VALUES ('Organization B', 'organization-b-test', 'b@test.local') RETURNING id",
    );
    await pool.query(
      "INSERT INTO organization_memberships (organization_id, user_id, role) VALUES ($1, $2, 'OWNER')",
      [organizationA.rows[0].id, user.rows[0].id],
    );
    const business = await pool.query<{ id: string }>(
      "INSERT INTO businesses (organization_id, name, slug) VALUES ($1, 'Business B', 'business-b-test') RETURNING id",
      [organizationB.rows[0].id],
    );
    const token = await jwt.signAsync({ sub: user.rows[0].id });
    await request(app.getHttpServer())
      .get(`/businesses/${business.rows[0].id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
  });

  it("allows an active superadmin to access global metrics", async () => {
    const user = await pool.query<{ id: string }>(
      "INSERT INTO users (email, password_hash, is_superadmin) VALUES ('superadmin@test.local', 'hash', TRUE) RETURNING id",
    );
    const token = await jwt.signAsync({ sub: user.rows[0].id });
    const response = (await request(app.getHttpServer())
      .get("/superadmin/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)) as { body: unknown };
    expect(response.body).toBeDefined();
    expect(typeof response.body).toBe("object");
  });

  it("allows only one confirmed appointment for simultaneous requests in the same slot", async () => {
    const fixture = await createAppointmentFixture();
    // The fixture works on Mondays. Keep the race in the future instead of
    // using a fixed date which eventually starts failing temporal validation.
    const nextMonday = new Date();
    nextMonday.setUTCDate(
      nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7 || 7),
    );
    nextMonday.setUTCHours(10, 0, 0, 0);
    const body = {
      customerId: fixture.customerId,
      employeeId: fixture.employeeId,
      serviceId: fixture.serviceId,
      startAt: nextMonday.toISOString(),
    };
    const createRequest = () =>
      request(app.getHttpServer())
        .post(`/businesses/${fixture.businessId}/appointments`)
        .set("Authorization", `Bearer ${fixture.token}`)
        .send(body);

    const [first, second] = await Promise.all([
      createRequest(),
      createRequest(),
    ]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);

    const appointments = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM appointments WHERE business_id = $1 AND status = 'CONFIRMED'",
      [fixture.businessId],
    );
    expect(appointments.rows[0].count).toBe("1");
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
  });
});
