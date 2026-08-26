import { Test, TestingModule } from "@nestjs/testing";
import { CalendarBlocksRepository } from "./calendar-blocks.repository";
import { CalendarBlocksService } from "./calendar-blocks.service";

describe("CalendarBlocksService", () => {
  let service: CalendarBlocksService;
  const repositoryMock = {
    canAccessBusiness: jest.fn(),
    canManageBusiness: jest.fn(),
    employeeBelongsToBusiness: jest.fn(),
    create: jest.fn(),
    listByBusiness: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const block = {
    id: "block-id",
    organization_id: "organization-id",
    business_id: "business-id",
    employee_id: "employee-id",
    type: "VACATION",
    start_at: new Date("2026-09-01T09:00:00.000Z"),
    end_at: new Date("2026-09-01T18:00:00.000Z"),
    reason: null,
    created_by_user_id: "user-id",
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarBlocksService,
        { provide: CalendarBlocksRepository, useValue: repositoryMock },
      ],
    }).compile();
    service = module.get(CalendarBlocksService);
  });
  afterEach(() =>
    Object.values(repositoryMock).forEach((mock) => mock.mockReset()),
  );

  it("rejects dates that do not form a positive interval", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.employeeBelongsToBusiness.mockResolvedValue(true);
    await expect(
      service.create(
        "business-id",
        {
          employeeId: "employee-id",
          type: "VACATION",
          startAt: "2026-09-02T09:00:00.000Z",
          endAt: "2026-09-01T09:00:00.000Z",
        },
        "user-id",
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(repositoryMock.create).not.toHaveBeenCalled();
  });

  it("rejects a block for an employee outside the business", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.employeeBelongsToBusiness.mockResolvedValue(false);
    await expect(
      service.create(
        "business-id",
        {
          employeeId: "other-employee",
          type: "VACATION",
          startAt: "2026-09-01T09:00:00.000Z",
          endAt: "2026-09-01T18:00:00.000Z",
        },
        "user-id",
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("deletes a block physically", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(block);
    repositoryMock.remove.mockResolvedValue(true);
    await expect(
      service.remove("business-id", "block-id", "user-id"),
    ).resolves.toBeUndefined();
    expect(repositoryMock.remove).toHaveBeenCalledWith(block);
  });

  it("rejects an invalid date range before listing", async () => {
    repositoryMock.canAccessBusiness.mockResolvedValue(true);
    await expect(
      service.list(
        "business-id",
        { from: "2026-09-02T00:00:00.000Z", to: "2026-09-01T00:00:00.000Z" },
        "user-id",
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(repositoryMock.listByBusiness).not.toHaveBeenCalled();
  });

  it("passes an employee filter with the date range", async () => {
    repositoryMock.canAccessBusiness.mockResolvedValue(true);
    repositoryMock.employeeBelongsToBusiness.mockResolvedValue(true);
    repositoryMock.listByBusiness.mockResolvedValue([]);
    const filters = { from: "2026-09-01T00:00:00.000Z" };

    await expect(
      service.listByEmployee("business-id", "employee-id", filters, "user-id"),
    ).resolves.toEqual([]);
    expect(repositoryMock.listByBusiness).toHaveBeenCalledWith(
      "business-id",
      filters,
      "employee-id",
    );
  });
});
