import { describe, expect, it } from "vitest";
import { createTaskSchema, createWorkspaceSchema } from "./index.js";

describe("request contracts", () => {
  it("rejects extra workspace fields", () => {
    expect(createWorkspaceSchema.safeParse({ name: "Team", slug: "team", ownerId: "spoofed" }).success).toBe(false);
  });

  it("rejects malformed dates and empty task titles", () => {
    expect(createTaskSchema.safeParse({ title: "", dueDate: "2026-02-30" }).success).toBe(false);
  });
});
