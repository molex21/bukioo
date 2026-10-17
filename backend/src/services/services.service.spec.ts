import { Test, TestingModule } from "@nestjs/testing";
import { ServicesRepository } from "./services.repository";
import { ServicesService } from "./services.service";

describe("ServicesService", () => {
  let service: ServicesService;
  const repositoryMock = {
    canAccessBusiness: jest.fn(),
    canManageBusiness: jest.fn(),
    categoryBelongsToBusiness: jest.fn(),
    create: jest.fn(),
    listByBusiness: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    countReferences: jest.fn(),
    remove: jest.fn(),
    listEmployees: jest.fn(),
    findActiveEmployeeIds: jest.fn(),
    replaceEmployees: jest.fn(),
  };
  const serviceRecord = {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: "22222222-2222-4222-8222-222222222222",
    business_id: "33333333-3333-4333-8333-333333333333",
    category_id: null,
    name: "Haircut",
    description: null,
    price: "25.00",
    price_type: "FIXED" as const,
    duration_minutes: 30,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    minimum_booking_notice_minutes: null,
    maximum_booking_advance_days: null,
    same_day_booking: null,
    auto_confirm_appointments: null,
    loyalty_earning_type: "INHERIT" as const,
    loyalty_fixed_points: null,
    loyalty_points_per_currency_unit: null,
    custom_fields: [],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    archived_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: ServicesRepository, useValue: repositoryMock },
      ],
    }).compile();
    service = module.get(ServicesService);
  });

  afterEach(() =>
    Object.values(repositoryMock).forEach((mock) => mock.mockReset()),
  );

  it("creates a normalized service for a managed business", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.create.mockResolvedValue(serviceRecord);

    await expect(
      service.create(
        serviceRecord.business_id,
        {
          name: " Haircut ",
          durationMinutes: 30,
          price: 25,
        },
        "actor-id",
      ),
    ).resolves.toBe(serviceRecord);

    expect(repositoryMock.create).toHaveBeenCalledWith(
      serviceRecord.business_id,
      expect.objectContaining({ name: "Haircut" }),
    );
  });

  it("rejects a category outside the business tenant", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.categoryBelongsToBusiness.mockResolvedValue(false);

    await expect(
      service.create(
        serviceRecord.business_id,
        {
          name: "Haircut",
          durationMinutes: 30,
          categoryId: "44444444-4444-4444-8444-444444444444",
        },
        "actor-id",
      ),
    ).rejects.toMatchObject({ status: 400 });

    expect(repositoryMock.create).not.toHaveBeenCalled();
  });

  it("requires fixed points for a FIXED loyalty service", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);

    await expect(
      service.create(
        serviceRecord.business_id,
        {
          name: "Oil change",
          durationMinutes: 30,
          loyaltyEarningType: "FIXED",
        },
        "actor-id",
      ),
    ).rejects.toMatchObject({ status: 400 });

    expect(repositoryMock.create).not.toHaveBeenCalled();
  });

  it("requires a minimum price for a service priced from", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);

    await expect(
      service.create(
        serviceRecord.business_id,
        {
          name: "Wheel change",
          durationMinutes: 30,
          priceType: "FROM",
        },
        "actor-id",
      ),
    ).rejects.toMatchObject({ status: 400 });

    expect(repositoryMock.create).not.toHaveBeenCalled();
  });

  it("normalizes configurable fields before saving a service", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.create.mockResolvedValue(serviceRecord);

    await service.create(
      serviceRecord.business_id,
      {
        name: "Wheel change",
        durationMinutes: 30,
        customFields: [
          {
            id: "44444444-4444-4444-8444-444444444444",
            label: " Number of wheels ",
            fieldType: "NUMBER",
            required: true,
            unitLabel: " wheels ",
            pricingMode: "PER_UNIT",
            unitPrice: 15,
            durationMode: "PER_UNIT",
            unitDurationMinutes: 10,
          },
        ],
      },
      "actor-id",
    );

    expect(repositoryMock.create).toHaveBeenCalledWith(
      serviceRecord.business_id,
      expect.objectContaining({
        customFields: [
          expect.objectContaining({
            label: "Number of wheels",
            unitLabel: "wheels",
            unitDurationMinutes: 10,
          }),
        ],
      }),
    );
  });

  it("rejects a price by option without a selector", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);

    await expect(
      service.create(
        serviceRecord.business_id,
        {
          name: "Haircut",
          durationMinutes: 30,
          customFields: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              label: "Hair type",
              fieldType: "TEXT",
              required: true,
              pricingMode: "OPTION",
            },
          ],
        },
        "actor-id",
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("deletes a service when it has no associated data", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(serviceRecord);
    repositoryMock.countReferences.mockResolvedValue(0);
    repositoryMock.remove.mockResolvedValue(true);

    await expect(
      service.remove(serviceRecord.business_id, serviceRecord.id, "actor-id"),
    ).resolves.toBeUndefined();
    expect(repositoryMock.remove).toHaveBeenCalledWith(serviceRecord);
  });

  it("rejects deletion when the service has associated data", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(serviceRecord);
    repositoryMock.countReferences.mockResolvedValue(1);

    await expect(
      service.remove(serviceRecord.business_id, serviceRecord.id, "actor-id"),
    ).rejects.toMatchObject({ status: 409 });

    expect(repositoryMock.remove).not.toHaveBeenCalled();
  });

  it("replaces service employees only after validating all are active in the business", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(serviceRecord);
    repositoryMock.findActiveEmployeeIds.mockResolvedValue([
      "employee-one",
      "employee-two",
    ]);

    await expect(
      service.replaceEmployees(
        serviceRecord.business_id,
        serviceRecord.id,
        { employeeIds: ["employee-one", "employee-two", "employee-one"] },
        "actor-id",
      ),
    ).resolves.toBeUndefined();

    expect(repositoryMock.replaceEmployees).toHaveBeenCalledWith(
      serviceRecord,
      ["employee-one", "employee-two"],
    );
  });

  it("rejects employees outside the business or inactive", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(serviceRecord);
    repositoryMock.findActiveEmployeeIds.mockResolvedValue(["employee-one"]);

    await expect(
      service.replaceEmployees(
        serviceRecord.business_id,
        serviceRecord.id,
        { employeeIds: ["employee-one", "other-business-employee"] },
        "actor-id",
      ),
    ).rejects.toMatchObject({ status: 400 });

    expect(repositoryMock.replaceEmployees).not.toHaveBeenCalled();
  });
});
