import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ListSuperadminEmployeesDto } from "./list-superadmin-employees.dto";

describe("ListSuperadminEmployeesDto", () => {
  it("transforms valid pagination filters", async () => {
    const dto = plainToInstance(ListSuperadminEmployeesDto, {
      search: "ana",
      status: "ARCHIVED",
      limit: "100",
      offset: "50",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ limit: 100, offset: 50 });
  });

  it("rejects invalid employee filters", async () => {
    const dto = plainToInstance(ListSuperadminEmployeesDto, {
      status: "SUSPENDED",
      limit: "0",
      offset: "-1",
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["status", "limit", "offset"]),
    );
  });
});
