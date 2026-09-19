import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ListOrganizationMembersDto } from "./list-organization-members.dto";
import { UpdateMemberRoleDto } from "./update-member-role.dto";
import { CreateEmployeeDto } from "../../employees/dto/create-employee.dto";
import { CreateSuperadminEmployeeDto } from "../../superadmin/dto/create-superadmin-employee.dto";

describe("Organization member DTOs", () => {
  it.each([
    { limit: 0 },
    { limit: 101 },
    { limit: 1.5 },
    { offset: -1 },
    { offset: "x" },
    { role: "SUPERADMIN" },
    { status: "DELETED" },
    { businessId: "bad" },
    { search: "x".repeat(151) },
  ])("rejects invalid filters %j", async (input) => {
    expect(
      (await validate(plainToInstance(ListOrganizationMembersDto, input)))
        .length,
    ).toBeGreaterThan(0);
  });
  it("transforms pagination", async () => {
    const dto = plainToInstance(ListOrganizationMembersDto, {
      limit: "25",
      offset: "0",
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto).toMatchObject({ limit: 25, offset: 0 });
  });
  it.each([
    { role: "OWNER" },
    { role: "CLIENT" },
    { role: "SUPERADMIN" },
    { role: "MANAGER", businessIds: null },
    { role: "MANAGER", businessIds: ["bad"] },
  ])("rejects invalid role input %j", async (input) => {
    expect(
      (await validate(plainToInstance(UpdateMemberRoleDto, input))).length,
    ).toBeGreaterThan(0);
  });
  it.each([CreateEmployeeDto, CreateSuperadminEmployeeDto])(
    "supports userId-only employee linking (%p)",
    async (Dto) => {
      expect(
        await validate(
          plainToInstance(Dto, {
            userId: "11111111-1111-4111-8111-111111111111",
          }),
        ),
      ).toEqual([]);
      expect(
        (await validate(plainToInstance(Dto, { userId: null }))).length,
      ).toBeGreaterThan(0);
      expect((await validate(plainToInstance(Dto, {}))).length).toBeGreaterThan(
        0,
      );
    },
  );
  it("requires email for a new superadmin invitation", async () => {
    const dto = plainToInstance(CreateSuperadminEmployeeDto, {
      firstName: "Ana",
      lastName: "Diaz",
      role: "EMPLOYEE",
    });
    expect((await validate(dto)).map((e) => e.property)).toContain("email");
  });
});
