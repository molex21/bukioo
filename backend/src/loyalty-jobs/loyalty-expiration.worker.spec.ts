import { LoyaltyService } from "../loyalty/loyalty.service";
import {
  LoyaltyExpirationWorker,
  LOYALTY_EXPIRATION_JOB,
  LOYALTY_EXPIRATION_NOTICE_30_DAYS_JOB,
  LOYALTY_EXPIRATION_NOTICE_7_DAYS_JOB,
} from "./loyalty-expiration.worker";

describe("LoyaltyExpirationWorker", () => {
  const pgBoss = {
    start: jest.fn(),
    stop: jest.fn(),
    work: jest.fn(),
    schedule: jest.fn(),
  };
  const loyaltyService = {
    expireDuePoints: jest.fn(),
    sendExpirationNotices: jest.fn(),
  };
  const workHandlers = new Map<string, () => Promise<void>>();

  beforeEach(() => {
    Object.values(pgBoss).forEach((mock) => mock.mockReset());
    loyaltyService.expireDuePoints.mockReset();
    loyaltyService.sendExpirationNotices.mockReset();
    pgBoss.start.mockResolvedValue(undefined);
    workHandlers.clear();
    pgBoss.work.mockImplementation(
      (jobName: string, handler: () => Promise<void>) => {
        workHandlers.set(jobName, handler);
        return Promise.resolve("worker-id");
      },
    );
    pgBoss.schedule.mockResolvedValue(undefined);
    pgBoss.stop.mockResolvedValue(undefined);
  });

  it("starts and schedules the hourly expiration job", async () => {
    const worker = new LoyaltyExpirationWorker(
      pgBoss,
      loyaltyService as LoyaltyService,
    );

    await worker.onModuleInit();

    expect(pgBoss.start).toHaveBeenCalledTimes(1);
    expect(pgBoss.work).toHaveBeenCalledWith(
      LOYALTY_EXPIRATION_JOB,
      expect.any(Function),
    );
    expect(pgBoss.schedule).toHaveBeenCalledWith(
      LOYALTY_EXPIRATION_JOB,
      "0 * * * *",
    );
    expect(pgBoss.schedule).toHaveBeenCalledWith(
      LOYALTY_EXPIRATION_NOTICE_30_DAYS_JOB,
      "15 8 * * *",
    );
    expect(pgBoss.schedule).toHaveBeenCalledWith(
      LOYALTY_EXPIRATION_NOTICE_7_DAYS_JOB,
      "15 8 * * *",
    );
  });

  it("expires due points when pg-boss runs the job", async () => {
    loyaltyService.expireDuePoints.mockResolvedValue(2);
    const worker = new LoyaltyExpirationWorker(
      pgBoss,
      loyaltyService as LoyaltyService,
    );

    await worker.onModuleInit();
    const handler = workHandlers.get(LOYALTY_EXPIRATION_JOB);
    expect(handler).toBeDefined();
    await handler?.();

    expect(loyaltyService.expireDuePoints).toHaveBeenCalledTimes(1);
  });

  it("sends the 30 and 7 day expiration notices", async () => {
    loyaltyService.sendExpirationNotices.mockResolvedValue({
      sent: 0,
      failed: 0,
    });
    const worker = new LoyaltyExpirationWorker(
      pgBoss,
      loyaltyService as LoyaltyService,
    );

    await worker.onModuleInit();
    await workHandlers.get(LOYALTY_EXPIRATION_NOTICE_30_DAYS_JOB)?.();
    await workHandlers.get(LOYALTY_EXPIRATION_NOTICE_7_DAYS_JOB)?.();

    expect(loyaltyService.sendExpirationNotices).toHaveBeenNthCalledWith(1, 30);
    expect(loyaltyService.sendExpirationNotices).toHaveBeenNthCalledWith(2, 7);
  });

  it("does nothing when jobs are disabled", async () => {
    const worker = new LoyaltyExpirationWorker(
      null,
      loyaltyService as LoyaltyService,
    );

    await worker.onModuleInit();

    expect(pgBoss.start).not.toHaveBeenCalled();
  });
});
