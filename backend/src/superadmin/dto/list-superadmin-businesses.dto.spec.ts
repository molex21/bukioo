import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ListSuperadminBusinessesDto } from "./list-superadmin-businesses.dto";

describe("ListSuperadminBusinessesDto", () => {
  it("transforms valid pagination filters", async () => {
    const dto = plainToInstance(ListSuperadminBusinessesDto, {
      search: "Centro",
      status: "ACTIVE",
      limit: "25",
      offset: "0",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ limit: 25, offset: 0 });
  });

  it("rejects unsupported statuses and pagination", async () => {
    const dto = plainToInstance(ListSuperadminBusinessesDto, {
      status: "ARCHIVED",
      limit: "101",
      offset: "-1",
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["status", "limit", "offset"]),
    );
  });
});
