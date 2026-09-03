import { EmployeesController } from "./employees.controller";
import { EmployeesService } from "./employees.service";

describe("EmployeesController", () => {
  const employeesService = { requestPasswordReset: jest.fn() };
  const controller = new EmployeesController(
    employeesService as unknown as EmployeesService,
  );

  afterEach(() => employeesService.requestPasswordReset.mockReset());

  it("delegates an administrative password reset without returning sensitive data", async () => {
    employeesService.requestPasswordReset.mockResolvedValue(undefined);

    await expect(
      controller.requestPasswordReset("business-id", "employee-id", "actor-id"),
    ).resolves.toBeUndefined();

    expect(employeesService.requestPasswordReset).toHaveBeenCalledWith(
      "business-id",
      "employee-id",
      "actor-id",
    );
  });
});
