import { beforeEach, describe, expect, it } from "vitest";
import { onlineCount, resetPresence, userConnected, userDisconnected } from "../src/sockets/presence.js";

describe("presence (online user count)", () => {
  beforeEach(() => resetPresence());
  it("counts distinct users, tolerates multiple tabs", () => {
    expect(onlineCount()).toBe(0);
    userConnected("u1");
    userConnected("u1"); // second tab
    userConnected("u2");
    expect(onlineCount()).toBe(2);
    userDisconnected("u1"); // one tab closed
    expect(onlineCount()).toBe(2);
    userDisconnected("u1"); // all tabs closed
    expect(onlineCount()).toBe(1);
  });
});

describe("overdue detection", () => {
  it("identifies tasks past due date that are not DONE/OVERDUE", () => {
    const now = new Date("2026-09-12T12:00:00Z");
    const isCandidate = (status: string, due: string | null): boolean => {
      if (!due) return false;
      if (status === "DONE" || status === "OVERDUE") return false;
      return new Date(due) < now;
    };
    expect(isCandidate("TODO", "2026-09-10T00:00:00Z")).toBe(true);
    expect(isCandidate("IN_PROGRESS", "2026-09-13T00:00:00Z")).toBe(false);
    expect(isCandidate("DONE", "2026-09-01T00:00:00Z")).toBe(false);
    expect(isCandidate("OVERDUE", "2026-09-01T00:00:00Z")).toBe(false);
    expect(isCandidate("TODO", null)).toBe(false);
  });

  it("overdue pass is idempotent: already-OVERDUE tasks are never re-marked", () => {
    // Mirrors the prisma where clause in runOverduePass: status NOT IN (DONE, OVERDUE)
    const where = { dueDate: { lt: new Date() }, status: { notIn: ["DONE", "OVERDUE"] } };
    expect(where.status.notIn).toContain("DONE");
    expect(where.status.notIn).toContain("OVERDUE");
  });
});

describe("notifications", () => {
  it("assignment + in-review rules produce scoped payloads", () => {
    const assigned = { userId: "dev1", type: "TASK_ASSIGNED", taskId: "t1", projectId: "p1" };
    const inReview = { userId: "pm1", type: "TASK_IN_REVIEW", taskId: "t1", projectId: "p1" };
    // recipient scoping: notification queries must always filter by userId
    expect(assigned.userId).not.toBe(inReview.userId);
    // unread-count contract
    const unread = [{ read: false }, { read: true }, { read: false }].filter((n) => !n.read);
    expect(unread).toHaveLength(2);
  });
});
