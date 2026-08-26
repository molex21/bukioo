import { Test, TestingModule } from "@nestjs/testing";
import { WorkingHoursRepository } from "./working-hours.repository";
import { WorkingHoursService } from "./working-hours.service";

describe("WorkingHoursService", () => {
  let service: WorkingHoursService;
  const repositoryMock = {
    canAccessBusiness: jest.fn(),
    canManageBusiness: jest.fn(),
    findActiveEmployee: jest.fn(),
    list: jest.fn(),
    replace: jest.fn(),
  };
  const employee = {
    id: "employee-id",
    organization_id: "organization-id",
    business_id: "business-id",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkingHoursService,
        { provide: WorkingHoursRepository, useValue: repositoryMock },
      ],
    }).compile();
    service = module.get(WorkingHoursService);
  });

  afterEach(() =>
    Object.values(repositoryMock).forEach((mock) => mock.mockReset()),
  );

  it("replaces split shifts after validation", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findActiveEmployee.mockResolvedValue(employee);
    await expect(
      service.replace(
        "business-id",
        "employee-id",
        {
          hours: [
            { dayOfWeek: 1, startTime: "09:00", endTime: "14:00" },
            { dayOfWeek: 1, startTime: "16:00", endTime: "20:00" },
          ],
        },
        "actor-id",
      ),
    ).resolves.toBeUndefined();
    expect(repositoryMock.replace).toHaveBeenCalledWith(
      employee,
      expect.any(Array),
    );
  });

  it("rejects overlapping shifts", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findActiveEmployee.mockResolvedValue(employee);
    await expect(
      service.replace(
        "business-id",
        "employee-id",
        {
          hours: [
            { dayOfWeek: 1, startTime: "09:00", endTime: "14:00" },
            { dayOfWeek: 1, startTime: "13:00", endTime: "18:00" },
          ],
        },
        "actor-id",
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(repositoryMock.replace).not.toHaveBeenCalled();
  });

  it("rejects an employee outside the selected business", async () => {
    repositoryMock.canAccessBusiness.mockResolvedValue(true);
    repositoryMock.findActiveEmployee.mockResolvedValue(null);
    await expect(
      service.list("business-id", "employee-id", "employee-user"),
    ).rejects.toMatchObject({ status: 404 });
  });
});
