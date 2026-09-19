import { ValidationPipe } from "@nestjs/common";
import { UpdatePlatformEmployeeDto } from "./update-platform-employee.dto";

describe("UpdatePlatformEmployeeDto", () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const check = (input: object) =>
    pipe.transform(input, {
      type: "body",
      metatype: UpdatePlatformEmployeeDto,
    });
  const base = { expectedUpdatedAt: "2026-09-13T10:00:00.000Z" };

  it("requires a valid version timestamp", async () => {
    await expect(check({})).rejects.toMatchObject({ status: 400 });
    await expect(
      check({ expectedUpdatedAt: "yesterday" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it.each([
    { userId: "other" },
    { role: "ADMIN" },
    { isSuperadmin: true },
    { isActive: "false" },
    { isActive: null },
    { firstName: null },
    { firstName: "" },
    { email: "bad" },
    { color: "red" },
    { notes: "x".repeat(2001) },
  ])("rejects invalid or account-only fields %j", async (input) => {
    await expect(check({ ...base, ...input })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("accepts clearing optional contact fields and changing employee status", async () => {
    await expect(
      check({
        ...base,
        email: null,
        phone: null,
        notes: null,
        color: null,
        isActive: false,
      }),
    ).resolves.toMatchObject({ isActive: false });
  });
});
