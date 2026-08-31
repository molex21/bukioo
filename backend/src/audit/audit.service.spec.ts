import { AuditRepository } from "./audit.repository";
import { AuditService } from "./audit.service";

describe("AuditService", () => {
  const repository = {
    canManageBusiness: jest.fn(),
    create: jest.fn(),
    listByBusiness: jest.fn(),
  };
  const service = new AuditService(repository as unknown as AuditRepository);

  beforeEach(() => {
    repository.canManageBusiness.mockReset();
    repository.create.mockReset();
    repository.listByBusiness.mockReset();
  });

  it("records an audit entry", async () => {
    const entry = {
      organizationId: "organization-id",
      businessId: "business-id",
      actorUserId: "actor-id",
      action: "APPOINTMENT_CREATED",
      entityType: "APPOINTMENT",
      entityId: "appointment-id",
      newValues: { status: "PENDING" },
    };

    await expect(service.record(entry)).resolves.toBeUndefined();
    expect(repository.create).toHaveBeenCalledWith(entry);
  });

  it("returns paginated audit logs for a manager", async () => {
    const filters = {
      action: "APPOINTMENT_CREATED",
      actorUserId: "11111111-1111-4111-8111-111111111111",
      limit: 20,
    };
    repository.canManageBusiness.mockResolvedValue(true);
    repository.listByBusiness.mockResolvedValue({
      total: "1",
      items: [
        {
          id: "audit-id",
          actor_user_id: filters.actorUserId,
          action: filters.action,
          entity_type: "APPOINTMENT",
          entity_id: "appointment-id",
          old_values: null,
          new_values: { status: "PENDING" },
          created_at: new Date("2026-08-31T10:00:00.000Z"),
        },
      ],
    });

    await expect(
      service.list("business-id", filters, "admin-id"),
    ).resolves.toMatchObject({
      pagination: { limit: 20, offset: 0, total: 1 },
      items: [{ id: "audit-id", actorUserId: filters.actorUserId }],
    });
  });

  it("rejects audit access outside a managed business", async () => {
    repository.canManageBusiness.mockResolvedValue(false);

    await expect(
      service.list("business-id", {}, "employee-id"),
    ).rejects.toMatchObject({ status: 403 });
    expect(repository.listByBusiness).not.toHaveBeenCalled();
  });

  it("rejects a reversed audit date range", async () => {
    await expect(
      service.list(
        "business-id",
        { from: "2026-09-02T00:00:00.000Z", to: "2026-09-01T00:00:00.000Z" },
        "admin-id",
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(repository.canManageBusiness).not.toHaveBeenCalled();
  });
});
