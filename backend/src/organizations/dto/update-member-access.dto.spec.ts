import { ValidationPipe } from "@nestjs/common";
import {
  UpdateMemberBusinessesDto,
  UpdateMemberStatusDto,
} from "./update-member-access.dto";

describe("Member access DTOs", () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const status = {
    status: "SUSPENDED",
    expectedStatus: "ACTIVE",
    expectedRole: "EMPLOYEE",
  };
  const companies = {
    businessIds: [],
    expectedBusinessIds: [],
    expectedRole: "EMPLOYEE",
  };
  it.each([
    { status: "INVITED" },
    { expectedRole: "OWNER" },
    { expectedStatus: null },
    { role: "ADMIN" },
    { userId: "other" },
  ])("rejects invalid status updates %j", async (patch) => {
    await expect(
      pipe.transform(
        { ...status, ...patch },
        { type: "body", metatype: UpdateMemberStatusDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it.each([
    { businessIds: null },
    { businessIds: ["bad"] },
    { expectedBusinessIds: null },
    { expectedRole: "ADMIN" },
    { role: "MANAGER" },
  ])("rejects invalid company updates %j", async (patch) => {
    await expect(
      pipe.transform(
        { ...companies, ...patch },
        { type: "body", metatype: UpdateMemberBusinessesDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("accepts an explicit empty assignment and valid suspension", async () => {
    await expect(
      pipe.transform(companies, {
        type: "body",
        metatype: UpdateMemberBusinessesDto,
      }),
    ).resolves.toMatchObject(companies);
    await expect(
      pipe.transform(status, { type: "body", metatype: UpdateMemberStatusDto }),
    ).resolves.toMatchObject(status);
  });
});
