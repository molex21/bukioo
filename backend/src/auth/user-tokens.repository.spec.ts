import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseService } from "../database/database.service";
import { UserTokensRepository } from "./user-tokens.repository";

describe("UserTokensRepository", () => {
  let repository: UserTokensRepository;

  const clientMock = { query: jest.fn() };
  const databaseServiceMock = {
    transaction: jest.fn(),
    query: jest.fn(),
  };

  beforeEach(async () => {
    databaseServiceMock.transaction.mockImplementation(
      async (callback: (client: typeof clientMock) => Promise<unknown>) =>
        callback(clientMock),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserTokensRepository,
        { provide: DatabaseService, useValue: databaseServiceMock },
      ],
    }).compile();

    repository = module.get(UserTokensRepository);
  });

  afterEach(() => {
    clientMock.query.mockReset();
    databaseServiceMock.transaction.mockReset();
    databaseServiceMock.query.mockReset();
  });

  it("replaces a pending email-verification token", async () => {
    clientMock.query.mockResolvedValue({});
    const expiresAt = new Date("2026-08-25T10:00:00.000Z");

    await repository.replaceEmailVerificationToken({
      userId: "user-id",
      tokenHash: "token-hash",
      expiresAt,
    });

    expect(clientMock.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("SET used_at = NOW()"),
      ["user-id", "EMAIL_VERIFICATION"],
    );
    expect(clientMock.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO user_tokens"),
      ["user-id", "EMAIL_VERIFICATION", "token-hash", expiresAt],
    );
  });

  it("consumes a valid token and marks its user email as verified", async () => {
    clientMock.query
      .mockResolvedValueOnce({ rows: [{ id: "token-id", user_id: "user-id" }] })
      .mockResolvedValue({});

    await expect(
      repository.consumeEmailVerificationToken("token-hash"),
    ).resolves.toBe(true);

    expect(clientMock.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("FOR UPDATE"),
      ["EMAIL_VERIFICATION", "token-hash"],
    );
    expect(clientMock.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("email_verified_at"),
      ["user-id"],
    );
  });

  it("replaces a pending password-reset token", async () => {
    clientMock.query.mockResolvedValue({});
    const expiresAt = new Date("2026-08-25T10:00:00.000Z");

    await repository.replacePasswordResetToken({
      userId: "user-id",
      tokenHash: "token-hash",
      expiresAt,
    });

    expect(clientMock.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("SET used_at = NOW()"),
      ["user-id", "PASSWORD_RESET"],
    );
    expect(clientMock.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO user_tokens"),
      ["user-id", "PASSWORD_RESET", "token-hash", expiresAt],
    );
  });

  it("consumes a password-reset token, changes the password, and revokes sessions", async () => {
    clientMock.query
      .mockResolvedValueOnce({ rows: [{ id: "token-id", user_id: "user-id" }] })
      .mockResolvedValue({});

    await expect(
      repository.consumePasswordResetToken({
        tokenHash: "token-hash",
        passwordHash: "new-password-hash",
      }),
    ).resolves.toBe("user-id");

    expect(clientMock.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("users.status = 'ACTIVE'"),
      ["PASSWORD_RESET", "token-hash"],
    );
    expect(clientMock.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("password_change_required = FALSE"),
      ["new-password-hash", "user-id"],
    );
    expect(clientMock.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("UPDATE user_sessions"),
      ["user-id"],
    );
  });

  it("does not reset a password with an unknown, expired, or used token", async () => {
    clientMock.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      repository.consumePasswordResetToken({
        tokenHash: "token-hash",
        passwordHash: "new-password-hash",
      }),
    ).resolves.toBeNull();

    expect(clientMock.query).toHaveBeenCalledTimes(1);
  });

  it("checks a password-reset token without consuming it", async () => {
    databaseServiceMock.query.mockResolvedValueOnce({ rowCount: 1 });

    await expect(
      repository.isPasswordResetTokenValid("token-hash"),
    ).resolves.toBe(true);

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("users.status = 'ACTIVE'"),
      ["PASSWORD_RESET", "token-hash"],
    );
  });

  it("does not consume an unknown, expired, or used token", async () => {
    clientMock.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      repository.consumeEmailVerificationToken("token-hash"),
    ).resolves.toBe(false);

    expect(clientMock.query).toHaveBeenCalledTimes(1);
  });

  it("verifies an active unverified account with a valid token", async () => {
    clientMock.query
      .mockResolvedValueOnce({ rows: [{ id: "token-id", user_id: "user-id" }] })
      .mockResolvedValue({});

    await expect(
      repository.verifyInitialEmail({
        userId: "user-id",
        tokenHash: "token-hash",
      }),
    ).resolves.toBe(true);

    expect(clientMock.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("users.email_verified_at IS NULL"),
      ["EMAIL_VERIFICATION", "token-hash", "user-id"],
    );
    expect(clientMock.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("email_verified_at"),
      ["user-id"],
    );
  });

  it("sets the first password only after the email is verified", async () => {
    databaseServiceMock.query.mockResolvedValue({ rowCount: 1 });

    await expect(
      repository.completeInitialPassword({
        userId: "user-id",
        passwordHash: "new-password-hash",
      }),
    ).resolves.toBe(true);

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("password_change_required = TRUE"),
      ["new-password-hash", "user-id"],
    );
  });
});
