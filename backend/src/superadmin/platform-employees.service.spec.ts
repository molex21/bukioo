import { DatabaseService } from "../database/database.service";
import { PlatformEmployeesService } from "./platform-employees.service";

describe("PlatformEmployeesService", () => {
  const query = jest.fn<Promise<{ rows: unknown[] }>, [string, unknown[]]>();
  const transaction = jest.fn();
  const service = new PlatformEmployeesService({
    transaction,
  } as unknown as DatabaseService);
  const timestamp = new Date("2026-09-13T10:00:00.000Z");
  const employee = {
    id: "employee",
    organization_id: "org",
    business_id: "business",
    user_id: "user",
    first_name: "Ana",
    last_name: "Díaz",
    email: "contact@example.com",
    phone: "123",
    notes: "Notes",
    color: "#6C5CE7",
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
    archived_at: null,
  };
  const input = { expectedUpdatedAt: timestamp.toISOString() };
  let previous: typeof employee;
  let actor: boolean;
  let organization: string | null;
  let business: string | null;
  let found: boolean;
  let capacity: { count: string; maximum: number | null };

  beforeEach(() => {
    query.mockReset();
    transaction.mockReset();
    previous = { ...employee };
    actor = true;
    organization = "ACTIVE";
    business = "ACTIVE";
    found = true;
    capacity = { count: "1", maximum: 10 };
    transaction.mockImplementation((callback: (client: object) => unknown) =>
      callback({ query }),
    );
    query.mockImplementation((sql: string, values: unknown[]) => {
      if (sql.includes("FROM users"))
        return Promise.resolve({ rows: actor ? [{ id: "actor" }] : [] });
      if (sql.includes("SELECT status FROM organizations"))
        return Promise.resolve({
          rows: organization ? [{ status: organization }] : [],
        });
      if (sql.includes("SELECT status FROM businesses"))
        return Promise.resolve({
          rows: business ? [{ status: business }] : [],
        });
      if (sql.includes("AS maximum"))
        return Promise.resolve({ rows: [capacity] });
      if (sql.startsWith("UPDATE employees"))
        return Promise.resolve({
          rows: [
            {
              ...previous,
              first_name: values[3],
              last_name: values[4],
              email: values[5],
              phone: values[6],
              color: values[7],
              notes: values[8],
              is_active: values[9],
              updated_at: new Date(timestamp.getTime() + 1),
            },
          ],
        });
      if (sql.includes("FROM employees WHERE"))
        return Promise.resolve({ rows: found ? [previous] : [] });
      return Promise.resolve({ rows: [] });
    });
  });

  const get = () => service.get("org", "business", "employee", "actor");
  const update = (patch = {}) =>
    service.update(
      "org",
      "business",
      "employee",
      { ...input, ...patch },
      "actor",
    );
  const updates = () =>
    query.mock.calls.filter(([sql]: [string]) => sql.startsWith("UPDATE"));

  it("returns active or archived employees with account linkage", async () => {
    previous.is_active = false;
    expect(await get()).toMatchObject({
      id: "employee",
      userId: "user",
      isActive: false,
      notes: "Notes",
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        "organization_id=$1 AND business_id=$2 AND id=$3",
      ),
      ["org", "business", "employee"],
    );
  });

  it("rejects non-superadmin access to reads and writes", async () => {
    actor = false;
    await expect(get()).rejects.toMatchObject({ status: 403 });
    await expect(update()).rejects.toMatchObject({ status: 403 });
    expect(updates()).toHaveLength(0);
  });

  it.each(["organization", "business", "employee"])(
    "rejects missing or out-of-scope %s",
    async (resource) => {
      if (resource === "organization") organization = null;
      if (resource === "business") business = null;
      if (resource === "employee") found = false;
      await expect(get()).rejects.toMatchObject({ status: 404 });
      await expect(update()).rejects.toMatchObject({ status: 404 });
      expect(updates()).toHaveLength(0);
    },
  );

  it.each(["organization", "business"])(
    "allows consultation but prevents writes in suspended %s",
    async (resource) => {
      if (resource === "organization") organization = "SUSPENDED";
      else business = "SUSPENDED";
      await expect(get()).resolves.toMatchObject({ id: "employee" });
      await expect(update()).rejects.toMatchObject({ status: 409 });
    },
  );

  it("rejects stale edits before changing data", async () => {
    await expect(
      update({ expectedUpdatedAt: "2026-09-12T10:00:00.000Z" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(updates()).toHaveLength(0);
  });

  it.each(["firstName", "lastName"])(
    "rejects whitespace-only %s",
    async (field) => {
      await expect(update({ [field]: "   " })).rejects.toMatchObject({
        status: 400,
      });
    },
  );

  it("normalizes contact data and supports clearing optional fields", async () => {
    const result = await update({
      firstName: " Ana ",
      email: "NEW@example.com",
      phone: null,
      notes: "",
      color: "#abcdef",
    });
    expect(result).toMatchObject({
      firstName: "Ana",
      email: "new@example.com",
      phone: null,
      notes: null,
      color: "#ABCDEF",
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO audit_logs"),
      expect.arrayContaining(["org", "business", "actor", "EMPLOYEE_UPDATED"]),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO platform_audit_logs"),
      expect.arrayContaining(["actor", "EMPLOYEE_UPDATED"]),
    );
  });

  it("archives without changing the linked account, memberships or appointments", async () => {
    expect(await update({ isActive: false })).toMatchObject({
      isActive: false,
      userId: "user",
    });
    expect(updates()).toHaveLength(1);
    expect(updates()[0][0]).toContain("UPDATE employees");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO platform_audit_logs"),
      expect.arrayContaining(["EMPLOYEE_ARCHIVED"]),
    );
  });

  it("reactivates the existing employee with capacity and locks", async () => {
    previous.is_active = false;
    expect(await update({ isActive: true })).toMatchObject({
      id: "employee",
      isActive: true,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        "SELECT status FROM organizations WHERE id=$1 FOR UPDATE",
      ),
      ["org"],
    );
    expect(query).toHaveBeenCalledWith(expect.stringContaining("AS maximum"), [
      "org",
    ]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO platform_audit_logs"),
      expect.arrayContaining(["EMPLOYEE_REACTIVATED"]),
    );
  });

  it("rejects reactivation when the plan capacity is exhausted", async () => {
    previous.is_active = false;
    capacity = { count: "10", maximum: 10 };
    await expect(update({ isActive: true })).rejects.toMatchObject({
      status: 409,
    });
    expect(updates()).toHaveLength(0);
  });

  it("does not charge another slot when an active employee is edited", async () => {
    capacity = { count: "10", maximum: 10 };
    await expect(update({ isActive: true })).resolves.toMatchObject({
      isActive: true,
    });
    expect(
      query.mock.calls.some(([sql]: [string]) => sql.includes("AS maximum")),
    ).toBe(false);
  });

  it("allows unlimited plan reactivation", async () => {
    previous.is_active = false;
    capacity = { count: "1000", maximum: null };
    await expect(update({ isActive: true })).resolves.toMatchObject({
      isActive: true,
    });
  });

  it("propagates audit failure so the database transaction rolls back", async () => {
    const implementation = query.getMockImplementation()!;
    query.mockImplementation((sql: string, values: unknown[]) => {
      if (sql.includes("INSERT INTO platform_audit_logs"))
        return Promise.reject(new Error("audit failed"));
      return implementation(sql, values);
    });
    await expect(update()).rejects.toThrow("audit failed");
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
