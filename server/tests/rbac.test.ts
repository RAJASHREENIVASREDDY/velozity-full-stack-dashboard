import { describe, expect, it } from "vitest";
import { ApiError } from "../src/utils/ApiError.js";
import {
  assertAdmin,
  assertCanCreateTask,
  assertCanManageProject,
  assertRoleAllowed,
  assertTaskVisible,
  canViewProject,
} from "../src/services/authorization.js";

const admin = { id: "a1", email: "a@x", name: "A", role: "ADMIN" as const };
const pm1 = { id: "pm1", email: "pm1@x", name: "PM1", role: "PROJECT_MANAGER" as const };
const pm2 = { id: "pm2", email: "pm2@x", name: "PM2", role: "PROJECT_MANAGER" as const };
const dev1 = { id: "d1", email: "d1@x", name: "D1", role: "DEVELOPER" as const };
const dev2 = { id: "d2", email: "d2@x", name: "D2", role: "DEVELOPER" as const };

describe("RBAC", () => {
  it("admin passes admin gate; others are rejected with 403", () => {
    expect(() => assertAdmin(admin)).not.toThrow();
    expect(() => assertAdmin(pm1)).toThrowError(ApiError);
    try {
      assertAdmin(dev1);
    } catch (e) {
      expect((e as ApiError).status).toBe(403);
    }
  });

  it("PM cannot manage another PM's project (404 hides existence)", () => {
    expect(() => assertCanManageProject(pm1, { creatorId: "pm1" })).not.toThrow();
    expect(() => assertCanManageProject(admin, { creatorId: "pm1" })).not.toThrow();
    try {
      assertCanManageProject(pm1, { creatorId: "pm2" });
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as ApiError).status).toBe(404);
    }
    expect(() => assertCanManageProject(dev1, { creatorId: "d1" })).toThrowError(ApiError);
  });

  it("developer can access own task but not another developer's task", () => {
    const own = { assignedDeveloperId: "d1", projectId: "p1", project: { creatorId: "pm1" } };
    const other = { assignedDeveloperId: "d2", projectId: "p1", project: { creatorId: "pm1" } };
    expect(() => assertTaskVisible(dev1, own)).not.toThrow();
    try {
      assertTaskVisible(dev1, other);
      throw new Error("should have thrown");
    } catch (e) {
      expect([403, 404]).toContain((e as ApiError).status);
    }
    void dev2;
  });

  it("PM sees only own projects; developer has no direct project view", () => {
    expect(canViewProject(pm1, { creatorId: "pm1" })).toBe(true);
    expect(canViewProject(pm1, { creatorId: "pm2" })).toBe(false);
    expect(canViewProject(admin, { creatorId: "pm2" })).toBe(true);
    expect(canViewProject(dev1, { creatorId: "d1" })).toBe(false);
  });

  it("PM cannot create tasks in another PM's project; developers cannot create tasks", () => {
    expect(() => assertCanCreateTask(pm1, { creatorId: "pm1" })).not.toThrow();
    expect(() => assertCanCreateTask(pm1, { creatorId: "pm2" })).toThrowError(ApiError);
    expect(() => assertCanCreateTask(dev1, { creatorId: "pm1" })).toThrowError(ApiError);
    void pm2;
  });

  it("role gate rejects unauthorized roles", () => {
    expect(() => assertRoleAllowed(dev1, ["ADMIN"])).toThrowError(ApiError);
    expect(() => assertRoleAllowed(admin, ["ADMIN"])).not.toThrow();
  });
});
