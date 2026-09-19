import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateSuperadminEmployeeDto } from "./create-superadmin-employee.dto";

describe("CreateSuperadminEmployeeDto", () => {
  it("accepts manager and employee roles", async () => {
    const dto = plainToInstance(CreateSuperadminEmployeeDto, {
      email: "employee@example.com",
      firstName: "Lucia",
      lastName: "Perez",
      role: "MANAGER",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("rejects roles that are not operational employee roles", async () => {
    const dto = plainToInstance(CreateSuperadminEmployeeDto, {
      email: "employee@example.com",
      firstName: "Lucia",
      lastName: "Perez",
      role: "OWNER",
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toContain("role");
  });
});
