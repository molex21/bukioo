import { SuperadminRepository } from "./superadmin.repository";
import { SuperadminService } from "./superadmin.service";

describe("SuperadminService", () => {
  const repository = {
    getDashboard: jest.fn(),
    listOrganizations: jest.fn(),
    findOrganization: jest.fn(),
    listOrganizationBusinesses: jest.fn(),
    findOrganizationBusiness: jest.fn(),
    listBusinessEmployees: jest.fn(),
    updateOrganizationStatus: jest.fn(),
    updateOrganizationSecurity: jest.fn(),
    listPlans: jest.fn(),
    findPlan: jest.fn(),
    createPlan: jest.fn(),
    updatePlan: jest.fn(),
    removePlan: jest.fn(),
    setSubscription: jest.fn(),
    recordAudit: jest.fn(),
  };
  const service = new SuperadminService(
    repository as unknown as SuperadminRepository,
  );
  const organization = {
    id: "organization-id",
    name: "Org",
    slug: "org",
    email: "org@example.com",
    status: "ACTIVE" as const,
    created_at: new Date("2026-08-01"),
    business_count: "2",
    employee_count: "3",
    subscription_plan_code: "pro",
    subscription_status: "ACTIVE",
  };
  const plan = {
    code: "pro",
    name: "Pro",
    max_employees: null,
    max_locations: null,
    max_monthly_appointments: null,
    can_use_loyalty: true,
    can_use_advanced_reports: true,
    can_use_multiple_locations: true,
    can_use_sms: false,
    trial_days: 14,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };
  const business = {
    id: "business-id",
    organization_id: organization.id,
    name: "Centro",
    slug: "centro",
    email: "centro@example.com",
    phone: "600000000",
    timezone: "Atlantic/Canary",
    logo_url: null,
    status: "ACTIVE" as const,
    employee_count: "4",
    created_at: new Date("2026-08-02"),
  };

  beforeEach(() =>
    Object.values(repository).forEach((mock) => mock.mockReset()),
  );

  it("maps global dashboard metrics to numbers", async () => {
    repository.getDashboard.mockResolvedValue({
      organizations_active: "2",
      organizations_suspended: "1",
      businesses: "4",
      employees: "5",
      customers: "6",
      appointments: "7",
      subscriptions_active: "1",
      subscriptions_trial: "1",
    });
    await expect(service.dashboard()).resolves.toEqual({
      organizations: { active: 2, suspended: 1 },
      businesses: 4,
      employees: 5,
      customers: 6,
      appointments: 7,
      subscriptions: { active: 1, trial: 1 },
    });
  });

  it("records an organization suspension", async () => {
    repository.findOrganization.mockResolvedValue(organization);
    repository.updateOrganizationStatus.mockResolvedValue(true);
    await service.updateOrganizationStatus(
      organization.id,
      "SUSPENDED",
      "superadmin-id",
    );
    expect(repository.recordAudit).toHaveBeenCalledWith(
      "superadmin-id",
      "ORGANIZATION_STATUS_UPDATED",
      "organization",
      organization.id,
      { status: "ACTIVE" },
      { status: "SUSPENDED" },
    );
  });

  it("assigns an active plan to an organization", async () => {
    repository.findOrganization.mockResolvedValue(organization);
    repository.findPlan.mockResolvedValue(plan);
    repository.setSubscription.mockResolvedValue({
      id: "subscription-id",
      plan_code: "pro",
    });
    await expect(
      service.setSubscription(
        organization.id,
        { planCode: "PRO", status: "ACTIVE" },
        "superadmin-id",
      ),
    ).resolves.toMatchObject({ plan_code: "pro" });
    expect(repository.setSubscription).toHaveBeenCalledWith(organization.id, {
      planCode: "pro",
      status: "ACTIVE",
    });
  });

  it("lists businesses within an existing organization with pagination", async () => {
    repository.findOrganization.mockResolvedValue(organization);
    repository.listOrganizationBusinesses.mockResolvedValue({
      items: [business],
      total: "1",
    });

    await expect(
      service.listOrganizationBusinesses(organization.id, { limit: 25 }),
    ).resolves.toEqual({
      pagination: { limit: 25, offset: 0, total: 1 },
      items: [
        expect.objectContaining({
          id: business.id,
          organizationId: organization.id,
          employeeCount: 4,
        }),
      ],
    });
  });

  it("returns 404 when a business is outside its organization", async () => {
    repository.findOrganization.mockResolvedValue(organization);
    repository.findOrganizationBusiness.mockResolvedValue(null);

    await expect(
      service.getOrganizationBusiness(organization.id, "other-business-id"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("lists only employees of the scoped business", async () => {
    repository.findOrganization.mockResolvedValue(organization);
    repository.findOrganizationBusiness.mockResolvedValue(business);
    repository.listBusinessEmployees.mockResolvedValue({
      items: [
        {
          id: "employee-id",
          first_name: "Ana",
          last_name: "Diaz",
          email: "ana@example.com",
          phone: "600000001",
          color: "#6C5CE7",
          is_active: false,
          created_at: new Date("2026-08-03"),
        },
      ],
      total: "1",
    });

    await expect(
      service.listBusinessEmployees(organization.id, business.id, {
        status: "ARCHIVED",
      }),
    ).resolves.toMatchObject({
      pagination: { limit: 50, offset: 0, total: 1 },
      items: [
        {
          id: "employee-id",
          firstName: "Ana",
          isActive: false,
        },
      ],
    });
    expect(repository.listBusinessEmployees).toHaveBeenCalledWith(
      organization.id,
      business.id,
      { status: "ARCHIVED" },
    );
  });
});
