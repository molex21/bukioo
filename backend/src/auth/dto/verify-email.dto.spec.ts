import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { VerifyEmailDto } from "./verify-email.dto";

describe("VerifyEmailDto", () => {
  it("accepts a six-digit verification code", async () => {
    const dto = plainToInstance(VerifyEmailDto, { token: "012345" });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("rejects codes that are not exactly six digits", async () => {
    const dto = plainToInstance(VerifyEmailDto, { token: "12345a" });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("token");
  });
});
