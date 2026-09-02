import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ListCustomersDto } from "./list-customers.dto";

describe("ListCustomersDto", () => {
  it("applies defaults and transforms pagination values", async () => {
    const dto = plainToInstance(ListCustomersDto, {
      q: "  lucia  ",
      limit: "25",
      offset: "0",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      q: "lucia",
      sortBy: "firstName",
      sortDirection: "asc",
      limit: 25,
      offset: 0,
    });
  });

  it("rejects an invalid sort field", async () => {
    const dto = plainToInstance(ListCustomersDto, { sortBy: "name" });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("sortBy");
  });

  it("rejects unsupported limits and negative offsets", async () => {
    const dto = plainToInstance(ListCustomersDto, {
      limit: "15",
      offset: "-1",
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["limit", "offset"]),
    );
  });
});
