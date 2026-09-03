import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseService } from "../database/database.service";
import { EmployeeRegistrationRepository } from "./employee-registration.repository";

describe("EmployeeRegistrationRepository", () => {
  let repository: EmployeeRegistrationRepository;

  const clientMock = { query: jest.fn() };
  const databaseServiceMock = {
    query: jest.fn(),
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    databaseServiceMock.transaction.mockImplementation(
      async (callback: (client: typeof clientMock) => Promise<unknown>) =>
        callback(clientMock),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeRegistrationRepository,
        { provide: DatabaseService, useValue: databaseServiceMock },
      ],
    }).compile();

    repository = module.get(EmployeeRegistrationRepository);
  });

  afterEach(() => {
    clientMock.query.mockReset();
    databaseServiceMock.query.mockReset();
    databaseServiceMock.transaction.mockReset();
  });

  it("requires access to every requested business", async () => {
    databaseServiceMock.query.mockResolvedValue({ rows: [{ count: "1" }] });

    await expect(
      repository.canManageEmployees("actor-id", "organization-id", [
        "business-id",
        "other-business-id",
      ]),
    ).resolves.toBe(false);

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "organization_memberships.role IN ('OWNER', 'ADMIN')",
      ),
      ["organization-id", ["business-id", "other-business-id"], "actor-id"],
    );
  });

  it("creates the user and both membership levels in one transaction", async () => {
    clientMock.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "user-id",
            email: "employee@example.com",
          },
        ],
      })
      .mockResolvedValue({ rows: [] });

    await expect(
      repository.create({
        email: "employee@example.com",
        passwordHash: "password-hash",
        organizationId: "organization-id",
        businessIds: ["business-id"],
        role: "EMPLOYEE",
      }),
    ).resolves.toMatchObject({ id: "user-id" });

    expect(databaseServiceMock.transaction).toHaveBeenCalledTimes(1);
    expect(clientMock.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("organization_memberships"),
      ["organization-id", "user-id", "EMPLOYEE"],
    );
    expect(clientMock.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("business_memberships"),
      ["user-id", "organization-id", ["business-id"]],
    );
  });

  it("creates the employee profile with its user and memberships in one transaction", async () => {
    clientMock.query
      .mockResolvedValueOnce({
        rows: [{ id: "user-id", email: "employee@example.com" }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: "employee-id", user_id: "user-id" }],
      });

    await expect(
      repository.createWithEmployee({
        email: "employee@example.com",
        passwordHash: "password-hash",
        organizationId: "organization-id",
        businessIds: ["business-id"],
        role: "EMPLOYEE",
        employee: {
          businessId: "business-id",
          firstName: "Ada",
          lastName: "Lovelace",
          email: "employee@example.com",
        },
      }),
    ).resolves.toMatchObject({
      user: { id: "user-id" },
      employee: { id: "employee-id", user_id: "user-id" },
    });

    expect(databaseServiceMock.transaction).toHaveBeenCalledTimes(1);
    expect(clientMock.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("INSERT INTO employees"),
      expect.arrayContaining(["organization-id", "business-id", "user-id"]),
    );
  });

  it("links an existing employee to its new user in one transaction", async () => {
    clientMock.query
      .mockResolvedValueOnce({
        rows: [{ id: "user-id", email: "employee@example.com" }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: "employee-id", user_id: "user-id" }],
      });

    await expect(
      repository.inviteExistingEmployee({
        email: "employee@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        passwordHash: "password-hash",
        organizationId: "organization-id",
        businessId: "business-id",
        employeeId: "employee-id",
      }),
    ).resolves.toMatchObject({ id: "employee-id", user_id: "user-id" });

    expect(databaseServiceMock.transaction).toHaveBeenCalledTimes(1);
    expect(clientMock.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("SET user_id = $1"),
      ["user-id", "employee-id", "organization-id", "business-id"],
    );
  });
});
