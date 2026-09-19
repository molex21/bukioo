import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { TransferOwnershipDto } from "./transfer-ownership.dto";

describe("TransferOwnershipDto", () => {
  const body = {
    currentOwnerMembershipId: "11111111-1111-4111-8111-111111111111",
    newOwnerMembershipId: "22222222-2222-4222-8222-222222222222",
  };
  it("accepts two membership UUIDs", async () => {
    expect(await validate(plainToInstance(TransferOwnershipDto, body))).toEqual(
      [],
    );
  });
  it.each([
    {},
    { ...body, currentOwnerMembershipId: null },
    { ...body, newOwnerMembershipId: "bad" },
    { ...body, newOwnerMembershipId: undefined },
  ])("rejects %j", async (input) => {
    expect(
      (await validate(plainToInstance(TransferOwnershipDto, input))).length,
    ).toBeGreaterThan(0);
  });
});
