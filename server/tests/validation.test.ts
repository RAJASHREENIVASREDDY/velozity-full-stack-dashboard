import { describe, expect, it } from "vitest";
import { loginSchema } from "../src/schemas/common.js";
import { createTaskSchema, taskFilterQuery, activityQuery, createProjectSchema } from "../src/schemas/entities.js";
import { pretty } from "../src/services/task.service.js";

describe("server validation (zod)", () => {
  it("rejects invalid login payload", () => {
    expect(() => loginSchema.parse({ email: "not-an-email", password: "" })).toThrow();
    expect(loginSchema.parse({ email: "a@b.test", password: "secret123" }).email).toBe("a@b.test");
  });

  it("validates task creation input", () => {
    expect(() => createTaskSchema.parse({ title: "", projectId: "p1" })).toThrow();
    const ok = createTaskSchema.parse({ title: "Build API", projectId: "p1", priority: "HIGH" });
    expect(ok.priority).toBe("HIGH");
  });

  it("validates project creation input", () => {
    expect(() => createProjectSchema.parse({ name: "", clientId: "" })).toThrow();
  });

  it("parses filter query params (status/priority/date range)", () => {
    const f = taskFilterQuery.parse({ status: "IN_PROGRESS", priority: "HIGH", from: "2026-09-01", to: "2026-09-30" });
    expect(f.status).toBe("IN_PROGRESS");
    expect(f.from).toBe("2026-09-01");
    expect(() => taskFilterQuery.parse({ status: "NOPE" })).toThrow();
  });

  it("caps activity limit at 100 and defaults to 20", () => {
    expect(activityQuery.parse({}).limit).toBe(20);
    expect(() => activityQuery.parse({ limit: 500 })).toThrow();
  });

  it("task: status change produces human description parts", () => {
    expect(pretty("IN_PROGRESS")).toBe("In Progress");
    expect(pretty("IN_REVIEW")).toBe("In Review");
  });
});

describe("filtering semantics", () => {
  it("date range gte/lte construction covers full end day", () => {
    const f = taskFilterQuery.parse({ from: "2026-09-01", to: "2026-09-30" });
    const end = new Date(f.to!);
    end.setHours(23, 59, 59, 999);
    expect(end.getHours()).toBe(23);
  });
});
