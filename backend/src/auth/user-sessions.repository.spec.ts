import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseService } from "../database/database.service";
import { UserSessionsRepository } from "./user-sessions.repository";

describe("UserSessionsRepository", () => {
  let repository: UserSessionsRepository;

  const databaseServiceMock = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSessionsRepository,
        {
          provide: DatabaseService,
          useValue: databaseServiceMock,
        },
      ],
    }).compile();

    repository = module.get<UserSessionsRepository>(UserSessionsRepository);
  });

  afterEach(() => {
    databaseServiceMock.query.mockReset();
  });

  it("finds an active session with its user status", async () => {
    const session = {
      id: "session-id",
      user_id: "user-id",
      refresh_token_hash: "refresh-token-hash",
      expires_at: new Date("2026-09-20T10:00:00.000Z"),
      user_status: "ACTIVE",
    };
    databaseServiceMock.query.mockResolvedValue({ rows: [session] });

    await expect(repository.findActiveById(session.id)).resolves.toEqual(
      session,
    );
    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("user_sessions.revoked_at IS NULL"),
      [session.id],
    );
  });

  it("updates only an active session during refresh rotation", async () => {
    databaseServiceMock.query.mockResolvedValue({ rowCount: 1 });

    await expect(
      repository.rotate({
        id: "session-id",
        userId: "user-id",
        refreshTokenHash: "next-refresh-token-hash",
      }),
    ).resolves.toBe(true);

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("last_used_at = NOW()"),
      ["next-refresh-token-hash", "session-id", "user-id"],
    );
  });

  it("revokes a session for its owner", async () => {
    databaseServiceMock.query.mockResolvedValue({ rowCount: 1 });

    await expect(repository.revoke("session-id", "user-id")).resolves.toBe(
      undefined,
    );

    expect(databaseServiceMock.query).toHaveBeenCalledWith(
      expect.stringContaining("SET revoked_at = NOW()"),
      ["session-id", "user-id"],
    );
  });
});
