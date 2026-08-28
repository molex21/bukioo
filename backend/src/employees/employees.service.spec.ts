import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "../auth/auth.service";
import { TwoFactorRepository } from "../auth/two-factor.repository";
import { EmployeesRepository } from "./employees.repository";
import { EmployeesService } from "./employees.service";

describe("EmployeesService", () => {
  let service: EmployeesService;

  const repositoryMock = {
    canAccessBusiness: jest.fn(),
    canManageBusiness: jest.fn(),
    create: jest.fn(),
    findActiveBusinessOrganizationId: jest.fn(),
    listByBusiness: jest.fn(),
    findActiveById: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  };
  const authServiceMock = {
    inviteEmployee: jest.fn(),
    inviteExistingEmployee: jest.fn(),
  };
  const twoFactorRepositoryMock = {
    reset: jest.fn(),
  };

  const employee = {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: "22222222-2222-4222-8222-222222222222",
    business_id: "33333333-3333-4333-8333-333333333333",
    user_id: null,
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    phone: null,
    color: "#AA22CC",
    is_active: true,
    notes: null,
    created_at: new Date("2026-08-25T10:00:00.000Z"),
    updated_at: new Date("2026-08-25T10:00:00.000Z"),
    archived_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: EmployeesRepository, useValue: repositoryMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: TwoFactorRepository, useValue: twoFactorRepositoryMock },
      ],
    }).compile();

    service = module.get(EmployeesService);
  });

  afterEach(() => {
    Object.values(repositoryMock).forEach((mock) => mock.mockReset());
    authServiceMock.inviteEmployee.mockReset();
    authServiceMock.inviteExistingEmployee.mockReset();
    twoFactorRepositoryMock.reset.mockReset();
  });

  it("creates an employee only for a business the actor manages", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.create.mockResolvedValue(employee);

    await expect(
      service.create(
        employee.business_id,
        {
          firstName: " Ada ",
          lastName: " Lovelace ",
          email: " ADA@EXAMPLE.COM ",
          color: "#aa22cc",
        },
        "actor-id",
      ),
    ).resolves.toBe(employee);

    expect(repositoryMock.create).toHaveBeenCalledWith(
      employee.business_id,
      expect.objectContaining({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        color: "#AA22CC",
      }),
    );
  });

  it("rejects creation when the actor cannot manage the business", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(false);

    await expect(
      service.create(
        employee.business_id,
        { firstName: "Ada", lastName: "Lovelace" },
        "actor-id",
      ),
    ).rejects.toMatchObject({ status: 403 });

    expect(repositoryMock.create).not.toHaveBeenCalled();
  });

  it("invites an employee when requested during creation", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findActiveBusinessOrganizationId.mockResolvedValue(
      employee.organization_id,
    );
    authServiceMock.inviteEmployee.mockResolvedValue({
      ...employee,
      user_id: "user-id",
    });

    await expect(
      service.create(
        employee.business_id,
        {
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          inviteUser: true,
        },
        "actor-id",
      ),
    ).resolves.toMatchObject({ user_id: "user-id" });

    expect(authServiceMock.inviteEmployee).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: employee.organization_id,
        businessId: employee.business_id,
        email: "ada@example.com",
      }),
    );
  });

  it("requires an email when creating an invitation", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);

    await expect(
      service.create(
        employee.business_id,
        { firstName: "Ada", lastName: "Lovelace", inviteUser: true },
        "actor-id",
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("resets an employee 2FA configuration and revokes its sessions", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findActiveById.mockResolvedValue({
      ...employee,
      user_id: "user-id",
    });
    twoFactorRepositoryMock.reset.mockResolvedValue(true);

    await expect(
      service.resetTwoFactor(employee.business_id, employee.id, "actor-id"),
    ).resolves.toBeUndefined();

    expect(twoFactorRepositoryMock.reset).toHaveBeenCalledWith("user-id");
  });

  it("invites an existing employee without a user account", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findActiveById.mockResolvedValue(employee);
    authServiceMock.inviteExistingEmployee.mockResolvedValue({
      ...employee,
      user_id: "user-id",
    });

    await expect(
      service.invite(employee.business_id, employee.id, "actor-id"),
    ).resolves.toMatchObject({ user_id: "user-id" });

    expect(authServiceMock.inviteExistingEmployee).toHaveBeenCalledWith({
      email: employee.email,
      organizationId: employee.organization_id,
      businessId: employee.business_id,
      employeeId: employee.id,
    });
  });

  it("does not invite an employee that already has an account", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findActiveById.mockResolvedValue({
      ...employee,
      user_id: "user-id",
    });

    await expect(
      service.invite(employee.business_id, employee.id, "actor-id"),
    ).rejects.toMatchObject({ status: 400 });

    expect(authServiceMock.inviteExistingEmployee).not.toHaveBeenCalled();
  });

  it("lists employees only for an accessible business", async () => {
    repositoryMock.canAccessBusiness.mockResolvedValue(true);
    repositoryMock.listByBusiness.mockResolvedValue([employee]);

    await expect(
      service.list(employee.business_id, "employee-id"),
    ).resolves.toEqual([employee]);
  });

  it("does not read an employee from another business", async () => {
    repositoryMock.canAccessBusiness.mockResolvedValue(true);
    repositoryMock.findActiveById.mockResolvedValue(null);

    await expect(
      service.get(employee.business_id, employee.id, "employee-id"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("archives an employee instead of deleting it", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findActiveById.mockResolvedValue(employee);
    repositoryMock.archive.mockResolvedValue(true);

    await expect(
      service.remove(employee.business_id, employee.id, "actor-id"),
    ).resolves.toBeUndefined();

    expect(repositoryMock.archive).toHaveBeenCalledWith(employee);
  });
});
