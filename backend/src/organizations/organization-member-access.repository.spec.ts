import type { PoolClient } from "pg";
import { DatabaseService } from "../database/database.service";
import { OrganizationMembersRepository } from "./organization-members.repository";

describe("Organization member access persistence", () => {
  const query = jest.fn<Promise<{ rows: unknown[] }>, [string, unknown[]]>();
  const client = { query } as unknown as PoolClient;
  const repository = new OrganizationMembersRepository({} as DatabaseService);
  beforeEach(() => query.mockReset().mockResolvedValue({ rows: [] }));

  it("updates only the specified organization membership", async () => {
    await repository.changeStatus(client, "org", "membership", "SUSPENDED");
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE organization_id=$1 AND id=$2"),
      ["org", "membership", "SUSPENDED"],
    );
    expect(query.mock.calls[0][0]).toContain("UPDATE organization_memberships");
  });

  it("replaces company assignments only within the target organization", async () => {
    await repository.replaceBusinesses(client, "org", "user", []);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(
      1,
      "DELETE FROM business_memberships WHERE organization_id=$1 AND user_id=$2",
      ["org", "user"],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("UNNEST($3::uuid[])"),
      ["org", "user", []],
    );
  });
});
