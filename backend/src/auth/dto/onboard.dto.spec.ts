import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { OnboardDto } from "./onboard.dto";

describe("OnboardDto", () => {
  it("accepts onboarding without employee organization or business IDs", async () => {
    const dto = plainToInstance(OnboardDto, {
      email: "owner@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      organizationName: "Example Company",
      organizationSlug: "example-company",
      timezone: "Atlantic/Canary",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it("rejects an invalid organization slug", async () => {
    const dto = plainToInstance(OnboardDto, {
      email: "owner@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      organizationName: "Example Company",
      organizationSlug: "Example Company",
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("organizationSlug");
  });
});
