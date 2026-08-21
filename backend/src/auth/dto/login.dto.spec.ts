import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LoginDto } from "./login.dto";

describe("LoginDto", () => {
  it("accepts a valid email and password", async () => {
    const dto = plainToInstance(LoginDto, {
      email: "user@example.com",
      password: "a-secure-password",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("rejects an invalid email", async () => {
    const dto = plainToInstance(LoginDto, {
      email: "not-an-email",
      password: "a-secure-password",
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("email");
  });

  it("rejects an empty password", async () => {
    const dto = plainToInstance(LoginDto, {
      email: "user@example.com",
      password: "",
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("password");
  });

  it("rejects a password longer than 128 characters", async () => {
    const dto = plainToInstance(LoginDto, {
      email: "user@example.com",
      password: "a".repeat(129),
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("password");
  });
});
