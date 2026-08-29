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

  it("gets loyalty settings scoped to the selected business", async () => {
    databaseService.query.mockResolvedValue({ rows: [] });
    const repository = new LoyaltyRepository(
      databaseService as DatabaseService,
    );

    await repository.findSettingsByBusiness("business-id");

    expect(databaseService.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM business_loyalty_settings"),
      ["business-id"],
    );
  });

  it("does not expire points when there are no due transactions", async () => {
    databaseService.query.mockResolvedValue({ rows: [] });
    const repository = new LoyaltyRepository(
      databaseService as DatabaseService,
    );

    await expect(repository.expireDuePoints()).resolves.toBe(0);
    expect(databaseService.query).toHaveBeenCalledWith(
      expect.stringMatching(/expires_at <= now\(\)/i),
      [100],
    );
  });

  it("prepares each expiration notice only once per threshold", async () => {
    databaseService.query.mockResolvedValue({ rows: [] });
    const repository = new LoyaltyRepository(
      databaseService as DatabaseService,
    );

    await repository.prepareExpirationNotices(30);

    expect(databaseService.query).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (loyalty_transaction_id, type)"),
      [30, "LOYALTY_POINTS_EXPIRING_30_DAYS"],
    );
  });

  it("includes the related appointment in each loyalty transaction", async () => {
    databaseService.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "customer-id",
            points_balance: 20,
            loyalty_level_id: null,
            level_name: null,
            minimum_points: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "transaction-id",
            type: "APPOINTMENT_EARNED",
            points: 10,
            reason: "Puntos por cita completada",
            appointment_id: "appointment-id",
            expires_at: null,
            created_at: new Date("2026-08-29T10:00:00.000Z"),
            reference_code: "APT-123",
            appointment_status: "COMPLETED",
            start_at: new Date("2026-08-29T09:00:00.000Z"),
            end_at: new Date("2026-08-29T10:00:00.000Z"),
            employee_id: "employee-id",
            employee_first_name: "Ana",
            employee_last_name: "Lopez",
            service_id: "service-id",
            service_name: "Corte",
            price_amount: "25.00",
            currency_code: "EUR",
          },
        ],
      });
    const repository = new LoyaltyRepository(
      databaseService as DatabaseService,
    );

    const result = await repository.getCustomerLoyalty(
      "business-id",
      "customer-id",
    );

    expect(result?.transactions[0].appointment).toEqual({
      id: "appointment-id",
      referenceCode: "APT-123",
      status: "COMPLETED",
      startAt: new Date("2026-08-29T09:00:00.000Z"),
      endAt: new Date("2026-08-29T10:00:00.000Z"),
      employee: { id: "employee-id", firstName: "Ana", lastName: "Lopez" },
      service: { id: "service-id", name: "Corte" },
      priceAmount: "25.00",
      currencyCode: "EUR",
    });
    expect(databaseService.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("LEFT JOIN appointments"),
      ["customer-id", "business-id"],
    );
  });
});
