import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken, newRefreshJti, sha256, refreshCookieOptions } from "../src/utils/tokens.js";
import { hashPassword, verifyPassword } from "../src/utils/password.js";
import { ApiError } from "../src/utils/ApiError.js";

describe("authentication", () => {
  it("hashes and verifies passwords (bcrypt, never plaintext)", async () => {
    const hash = await hashPassword("Velozity123!");
    expect(hash).not.toContain("Velozity123!");
    expect(await verifyPassword("Velozity123!", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("issues and verifies short-lived access tokens", () => {
    const token = signAccessToken({ id: "u1", email: "a@x.test", role: "ADMIN" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("u1");
    expect(payload.role).toBe("ADMIN");
  });

  it("issues refresh tokens with unique jti and sha256 binding", () => {
    const j1 = newRefreshJti();
    const j2 = newRefreshJti();
    expect(j1).not.toBe(j2);
    const t = signRefreshToken("u1", j1);
    expect(verifyRefreshToken(t).jti).toBe(j1);
    expect(sha256(t)).toHaveLength(64);
  });

  it("uses HttpOnly secure-aware cookie options (never localStorage)", () => {
    const opts = refreshCookieOptions(7 * 86400000);
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe("/api/auth");
    expect(["lax", "none"]).toContain(opts.sameSite);
  });

  it("has consistent error format without leaking internals", () => {
    const err = ApiError.forbidden("You do not have permission");
    expect(err.status).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
    expect(JSON.stringify(err)).not.toContain("password");
  });
});
