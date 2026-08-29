import { DatabaseService } from "../database/database.service";
import { LoyaltyRepository } from "./loyalty.repository";

describe("LoyaltyRepository", () => {
  const databaseService = {
    query: jest.fn(),
  };

  beforeEach(() => {
    databaseService.query.mockReset();
  });

  it("scopes level lookup to its business", async () => {
    databaseService.query.mockResolvedValue({ rows: [] });
    const repository = new LoyaltyRepository(
      databaseService as DatabaseService,
    );

    await repository.findById("business-id", "level-id");

    expect(databaseService.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = $1 AND business_id = $2"),
      ["level-id", "business-id"],
    );
  });

  it("counts only active customer references before deletion", async () => {
    databaseService.query.mockResolvedValue({ rows: [{ count: "0" }] });
    const repository = new LoyaltyRepository(
      databaseService as DatabaseService,
    );

    await repository.countCustomers({
      id: "level-id",
      organization_id: "organization-id",
      business_id: "business-id",
    } as never);

    expect(databaseService.query).toHaveBeenCalledWith(
      expect.stringContaining("AND anonymized_at IS NULL"),
      ["level-id", "business-id", "organization-id"],
    );
  });
});
