import { describe, expect, it } from "vitest";
import { makeAuth, RateLimitError } from "@/application/auth";
import { makeMailerSpy, makeTestRepos } from "../helpers";

function setup() {
  const { authRepo } = makeTestRepos();
  const mailer = makeMailerSpy();
  const auth = makeAuth({ authRepo, mailer, baseUrl: "http://test" });
  return { authRepo, mailer, auth };
}

function setupWithDb() {
  const repos = makeTestRepos();
  const mailer = makeMailerSpy();
  const auth = makeAuth({ authRepo: repos.authRepo, mailer, baseUrl: "http://test" });
  return { ...repos, mailer, auth };
}

describe("magic link", () => {
  it("mengirim email berisi tautan verify", async () => {
    const { mailer, auth } = setup();
    await auth.requestLogin("user@contoh.id");

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe("user@contoh.id");
  });

  it("token hanya bisa dipakai sekali", async () => {
    const { authRepo, auth } = setup();
    await authRepo.createToken("token123", "user@contoh.id", 15);

    const session1 = await auth.verifyLoginToken("token123");
    expect(session1).not.toBeNull();

    const session2 = await auth.verifyLoginToken("token123");
    expect(session2).toBeNull();

    const user = await authRepo.findUserBySession(session1!);
    expect(user?.email).toBe("user@contoh.id");
  });

  it("token kedaluwarsa ditolak", async () => {
    const { db, authRepo, auth } = setupWithDb();
    await db.run(
      "INSERT INTO auth_tokens (token, email, expires_at, created_at) VALUES ('tokenexp', 'user@contoh.id', datetime('now', '-1 hour'), datetime('now', '-2 hours'))"
    );

    expect(await auth.verifyLoginToken("tokenexp")).toBeNull();
  });
});

describe("rate limiting", () => {
  it("menolak permintaan ke-4 dalam satu jam", async () => {
    const { mailer, auth } = setup();

    await auth.requestLogin("spam@contoh.id");
    await auth.requestLogin("spam@contoh.id");
    await auth.requestLogin("spam@contoh.id");

    await expect(auth.requestLogin("spam@contoh.id")).rejects.toThrow(RateLimitError);
    expect(mailer.sent).toHaveLength(3);
  });

  it("email lain tidak terdampak", async () => {
    const { auth } = setup();
    await auth.requestLogin("a@contoh.id");
    await auth.requestLogin("a@contoh.id");
    await auth.requestLogin("a@contoh.id");

    await expect(auth.requestLogin("b@contoh.id")).resolves.toBeUndefined();
  });
});
