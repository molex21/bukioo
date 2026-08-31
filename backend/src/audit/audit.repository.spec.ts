import { DatabaseService } from "../database/database.service";
import { AuditRepository } from "./audit.repository";

describe("AuditRepository", () => {
  const databaseService = { query: jest.fn() };

  beforeEach(() => databaseService.query.mockReset());

  it("scopes audit logs to a business with its filters", async () => {
    databaseService.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: "0" }] });
    const repository = new AuditRepository(
      databaseService as unknown as DatabaseService,
    );

    await repository.listByBusiness("business-id", {
      actorUserId: "11111111-1111-4111-8111-111111111111",
      limit: 10,
      offset: 5,
    });

    expect(databaseService.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("actor_user_id = $5::uuid"),
      [
        "business-id",
        null,
        null,
        null,
        "11111111-1111-4111-8111-111111111111",
        null,
        null,
        10,
        5,
      ],
    );
  });
});
