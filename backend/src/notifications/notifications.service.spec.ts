import { NotificationsService } from "./notifications.service";
import { NotificationsRepository } from "./notifications.repository";

describe("NotificationsService", () => {
  const repository = {
    canManageBusiness: jest.fn(),
    canAccessBusiness: jest.fn(),
    listByBusiness: jest.fn(),
    findSettingsByBusiness: jest.fn(),
    updateSettings: jest.fn(),
  };
  const service = new NotificationsService(
    repository as unknown as NotificationsRepository,
  );

  beforeEach(() => {
    repository.canManageBusiness.mockReset();
    repository.canAccessBusiness.mockReset();
    repository.listByBusiness.mockReset();
    repository.findSettingsByBusiness.mockReset();
    repository.updateSettings.mockReset();
  });

  it("lists notifications for an owner or admin with business access", async () => {
    repository.canManageBusiness.mockResolvedValue(true);
    repository.listByBusiness.mockResolvedValue([]);

    await expect(
      service.list("business-id", { status: "FAILED", limit: 20 }, "user-id"),
    ).resolves.toEqual([]);

    expect(repository.listByBusiness).toHaveBeenCalledWith("business-id", {
      status: "FAILED",
      limit: 20,
    });
  });

  it("rejects an employee without management permission", async () => {
    repository.canManageBusiness.mockResolvedValue(false);

    await expect(
      service.list("business-id", {}, "user-id"),
    ).rejects.toMatchObject({
      status: 403,
    });
    expect(repository.listByBusiness).not.toHaveBeenCalled();
  });

  it("rejects an invalid date range", async () => {
    await expect(
      service.list(
        "business-id",
        { from: "2026-09-02T00:00:00.000Z", to: "2026-09-01T00:00:00.000Z" },
        "user-id",
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("lets an employee with business access read notification settings", async () => {
    const settings = {
      business_id: "business-id",
      organization_id: "organization-id",
      appointment_reminder_enabled: true,
      appointment_reminder_hours_before: 24,
    };
    repository.canAccessBusiness.mockResolvedValue(true);
    repository.findSettingsByBusiness.mockResolvedValue(settings);

    await expect(
      service.getSettings("business-id", "employee-id"),
    ).resolves.toBe(settings);
  });

  it("updates reminder settings only for a manager", async () => {
    const settings = {
      business_id: "business-id",
      organization_id: "organization-id",
      appointment_reminder_enabled: true,
      appointment_reminder_hours_before: 24,
    };
    repository.canManageBusiness.mockResolvedValue(true);
    repository.findSettingsByBusiness.mockResolvedValue(settings);
    repository.updateSettings.mockResolvedValue({
      ...settings,
      appointment_reminder_enabled: false,
      appointment_reminder_hours_before: 48,
    });

    await expect(
      service.updateSettings(
        "business-id",
        {
          appointmentReminderEnabled: false,
          appointmentReminderHoursBefore: 48,
        },
        "admin-id",
      ),
    ).resolves.toMatchObject({
      appointment_reminder_enabled: false,
      appointment_reminder_hours_before: 48,
    });
  });
});
