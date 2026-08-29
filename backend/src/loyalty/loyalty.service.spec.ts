import { Test, TestingModule } from "@nestjs/testing";
import { EmailProvider } from "../auth/email.provider";
import { LoyaltyRepository } from "./loyalty.repository";
import { LoyaltyService } from "./loyalty.service";

describe("LoyaltyService", () => {
  let service: LoyaltyService;

  const repositoryMock = {
    canAccessBusiness: jest.fn(),
    canManageBusiness: jest.fn(),
    create: jest.fn(),
    listByBusiness: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    countCustomers: jest.fn(),
    remove: jest.fn(),
    findSettingsByBusiness: jest.fn(),
    updateSettings: jest.fn(),
    reconcileAppointment: jest.fn(),
    getCustomerLoyalty: jest.fn(),
    adjustCustomerPoints: jest.fn(),
    expireDuePoints: jest.fn(),
    prepareExpirationNotices: jest.fn(),
    markExpirationNoticeSent: jest.fn(),
    markExpirationNoticeFailed: jest.fn(),
  };
  const emailProviderMock = { sendPointsExpiration: jest.fn() };

  const level = {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: "22222222-2222-4222-8222-222222222222",
    business_id: "33333333-3333-4333-8333-333333333333",
    name: "Gold",
    minimum_points: 100,
    sort_order: 1,
    is_active: true,
    created_at: new Date("2026-08-29T10:00:00.000Z"),
    updated_at: new Date("2026-08-29T10:00:00.000Z"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        { provide: LoyaltyRepository, useValue: repositoryMock },
        { provide: EmailProvider, useValue: emailProviderMock },
      ],
    }).compile();

    service = module.get(LoyaltyService);
  });

  afterEach(() => {
    Object.values(repositoryMock).forEach((mock) => mock.mockReset());
    emailProviderMock.sendPointsExpiration.mockReset();
  });

  it("creates a level only for an actor who manages the business", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.create.mockResolvedValue(level);

    await expect(
      service.create(
        level.business_id,
        { name: " Gold ", minimumPoints: 100 },
        "actor-id",
      ),
    ).resolves.toBe(level);

    expect(repositoryMock.create).toHaveBeenCalledWith(level.business_id, {
      name: "Gold",
      minimumPoints: 100,
    });
  });

  it("sends and records an expiration notice", async () => {
    const notice = {
      id: "notification-id",
      email: "customer@example.com",
      business_name: "Peluqueria BUKIOO",
      points: 20,
      expires_at: new Date("2026-09-30T23:59:59.999Z"),
      timezone: "Atlantic/Canary",
      days_before_expiration: 30 as const,
    };
    repositoryMock.prepareExpirationNotices.mockResolvedValue([notice]);
    emailProviderMock.sendPointsExpiration.mockResolvedValue(undefined);
    repositoryMock.markExpirationNoticeSent.mockResolvedValue(undefined);

    await expect(service.sendExpirationNotices(30)).resolves.toEqual({
      sent: 1,
      failed: 0,
    });

    expect(emailProviderMock.sendPointsExpiration).toHaveBeenCalledWith({
      email: notice.email,
      businessName: notice.business_name,
      points: notice.points,
      expiresAt: notice.expires_at,
      timezone: notice.timezone,
      daysBeforeExpiration: 30,
    });
    expect(repositoryMock.markExpirationNoticeSent).toHaveBeenCalledWith(
      notice.id,
    );
  });

  it("records a failed expiration notice for the next retry", async () => {
    repositoryMock.prepareExpirationNotices.mockResolvedValue([
      {
        id: "notification-id",
        email: "customer@example.com",
        business_name: "Peluqueria BUKIOO",
        points: 20,
        expires_at: new Date("2026-09-30T23:59:59.999Z"),
        timezone: "Atlantic/Canary",
        days_before_expiration: 7,
      },
    ]);
    emailProviderMock.sendPointsExpiration.mockRejectedValue(
      new Error("Resend no disponible"),
    );
    repositoryMock.markExpirationNoticeFailed.mockResolvedValue(undefined);

    await expect(service.sendExpirationNotices(7)).resolves.toEqual({
      sent: 0,
      failed: 1,
    });
    expect(repositoryMock.markExpirationNoticeFailed).toHaveBeenCalledWith(
      "notification-id",
      "Resend no disponible",
    );
  });

  it("rejects listing levels outside the user's business access", async () => {
    repositoryMock.canAccessBusiness.mockResolvedValue(false);

    await expect(
      service.list(level.business_id, "employee-id"),
    ).rejects.toMatchObject({
      status: 403,
    });
  });

  it("updates a level active status", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(level);
    repositoryMock.update.mockResolvedValue({ ...level, is_active: false });

    await expect(
      service.update(
        level.business_id,
        level.id,
        { isActive: false },
        "actor-id",
      ),
    ).resolves.toMatchObject({ is_active: false });
  });

  it("does not delete a level referenced by customers", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(level);
    repositoryMock.countCustomers.mockResolvedValue(1);

    await expect(
      service.remove(level.business_id, level.id, "actor-id"),
    ).rejects.toMatchObject({ status: 409 });

    expect(repositoryMock.remove).not.toHaveBeenCalled();
  });

  it("requires fixed points when enabling a FIXED default", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findSettingsByBusiness.mockResolvedValue({
      business_id: level.business_id,
      organization_id: level.organization_id,
      loyalty_enabled: false,
      default_earning_type: "NONE",
      default_fixed_points: null,
      default_points_per_currency_unit: null,
      points_expiration_months: 12,
    });

    await expect(
      service.updateSettings(
        level.business_id,
        { loyaltyEnabled: true, defaultLoyaltyEarningType: "FIXED" },
        "actor-id",
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("updates a complete enabled appointment earning configuration", async () => {
    const settings = {
      business_id: level.business_id,
      organization_id: level.organization_id,
      loyalty_enabled: false,
      default_earning_type: "NONE",
      default_fixed_points: null,
      default_points_per_currency_unit: null,
      points_expiration_months: 12,
    };
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findSettingsByBusiness.mockResolvedValue(settings);
    repositoryMock.updateSettings.mockResolvedValue({
      ...settings,
      loyalty_enabled: true,
      default_earning_type: "FIXED",
      default_fixed_points: 10,
    });

    await expect(
      service.updateSettings(
        level.business_id,
        {
          loyaltyEnabled: true,
          defaultLoyaltyEarningType: "FIXED",
          defaultLoyaltyFixedPoints: 10,
        },
        "actor-id",
      ),
    ).resolves.toMatchObject({ loyalty_enabled: true });
  });
});
