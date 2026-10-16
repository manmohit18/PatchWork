import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { createPrismaClient } from "@patchwork/db";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import type { OAuthGateway } from "../src/oauth.js";
import { sha256 } from "../src/oauth.js";

loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
if (!process.env.TEST_DATABASE_URL) throw new Error("Missing TEST_DATABASE_URL");
const db = createPrismaClient(process.env.TEST_DATABASE_URL);
const origin = "http://localhost:3000";
const config: AppConfig = {
  appOrigin: origin, callbackUrl: `${origin}/auth/github/callback`,
  githubClientId: "test-client-id", githubClientSecret: "test-client-secret", secureCookies: false,
};
const oauth: OAuthGateway = {
  authorizationUrl(state, challenge) {
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("scope", "read:user");
    return url.toString();
  },
  async exchangeCode() { return "mock-access-token"; },
  async fetchProfile() { return { id: 12345, login: "student", name: "Student", email: null, avatar_url: null }; },
};

async function createUserSession(githubId: string) {
  const user = await db.user.create({ data: { githubId, githubLogin: `student-${githubId}` } });
  const token = `test-token-${githubId}`;
  await db.session.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60_000) } });
  return { user, cookie: `patchwork_session=${token}` };
}

beforeEach(async () => {
  await db.task.deleteMany();
  await db.workspaceMember.deleteMany();
  await db.workspace.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
});
afterAll(async () => { await db.$disconnect(); });

describe("Milestone 1 API", () => {
  it("rejects unauthenticated and cross-workspace requests", async () => {
    const app = createApp(db, oauth, config);
    expect((await request(app).get("/api/v1/workspaces")).status).toBe(401);
    const a = await createUserSession("1");
    const b = await createUserSession("2");
    const created = await request(app).post("/api/v1/workspaces").set("Origin", origin).set("Cookie", a.cookie)
      .send({ name: "Team A", slug: "team-a" });
    expect(created.status).toBe(201);
    const workspaceId = created.body.data.id as string;
    expect((await request(app).get("/api/v1/workspaces").set("Cookie", b.cookie)).body.data).toEqual([]);
    expect((await request(app).get(`/api/v1/workspaces/${workspaceId}/tasks`).set("Cookie", b.cookie)).status).toBe(404);
    expect((await request(app).post(`/api/v1/workspaces/${workspaceId}/tasks`).set("Origin", origin).set("Cookie", b.cookie).send({ title: "Intrusion" })).status).toBe(404);
    expect(await db.workspaceMember.count({ where: { workspaceId, userId: a.user.id, role: "OWNER" } })).toBe(1);
  });

  it("validates input, origin, assignee membership, and viewer role", async () => {
    const app = createApp(db, oauth, config);
    const a = await createUserSession("1");
    const b = await createUserSession("2");
    const workspace = await db.workspace.create({ data: { name: "Team", slug: "team", ownerId: a.user.id } });
    await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: a.user.id, role: "OWNER" } });
    await db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: b.user.id, role: "VIEWER" } });
    const url = `/api/v1/workspaces/${workspace.id}/tasks`;
    expect((await request(app).post(url).set("Cookie", a.cookie).send({ title: "No origin" })).status).toBe(403);
    expect((await request(app).post(url).set("Origin", origin).set("Cookie", a.cookie).send({ title: "" })).status).toBe(400);
    expect((await request(app).post(url).set("Origin", origin).set("Cookie", a.cookie).send({ title: "Task", dueDate: "2026-02-30" })).status).toBe(400);
    const outsider = await createUserSession("3");
    expect((await request(app).post(url).set("Origin", origin).set("Cookie", a.cookie).send({ title: "Task", assigneeId: outsider.user.id })).status).toBe(400);
    expect((await request(app).post(url).set("Origin", origin).set("Cookie", b.cookie).send({ title: "Viewer write" })).status).toBe(403);
    expect(await db.task.count()).toBe(0);
  });

  it("persists a task across application instances", async () => {
    const a = await createUserSession("1");
    const first = createApp(db, oauth, config);
    const createdWorkspace = await request(first).post("/api/v1/workspaces").set("Origin", origin).set("Cookie", a.cookie)
      .send({ name: "Team", slug: "team" });
    const workspaceId = createdWorkspace.body.data.id as string;
    const createdTask = await request(first).post(`/api/v1/workspaces/${workspaceId}/tasks`).set("Origin", origin).set("Cookie", a.cookie)
      .send({ title: "Build foundation", dueDate: "2026-10-20" });
    expect(createdTask.status).toBe(201);
    const second = createApp(db, oauth, config);
    const listed = await request(second).get(`/api/v1/workspaces/${workspaceId}/tasks`).set("Cookie", a.cookie);
    expect(listed.status).toBe(200);
    expect(listed.body.data.items).toMatchObject([{ id: createdTask.body.data.id, title: "Build foundation", dueDate: "2026-10-20" }]);
  });

  it("uses state and PKCE and rejects an invalid callback", async () => {
    const app = createApp(db, oauth, config);
    const started = await request(app).get("/auth/github/start");
    expect(started.status).toBe(302);
    const url = new URL(started.headers.location as string);
    expect(url.searchParams.get("scope")).toBe("read:user");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    const cookies = (started.headers["set-cookie"] as unknown as string[]).map((cookie) => cookie.split(";")[0]);
    const bad = await request(app).get("/auth/github/callback?code=code&state=wrong").set("Cookie", cookies);
    expect(bad.status).toBe(400);
    expect(await db.session.count()).toBe(0);
  });

  it("creates a hashed server session after a valid callback", async () => {
    const app = createApp(db, oauth, config);
    const started = await request(app).get("/auth/github/start");
    const state = new URL(started.headers.location as string).searchParams.get("state");
    const cookies = (started.headers["set-cookie"] as unknown as string[]).map((cookie) => cookie.split(";")[0]);
    const finished = await request(app).get(`/auth/github/callback?code=code&state=${state}`).set("Cookie", cookies);
    expect(finished.status).toBe(302);
    const sessionCookie = (finished.headers["set-cookie"] as unknown as string[]).find((cookie) => cookie.startsWith("patchwork_session="));
    expect(sessionCookie).toBeTruthy();
    const token = sessionCookie!.split(";")[0]!.split("=")[1]!;
    const saved = await db.session.findFirstOrThrow();
    expect(saved.tokenHash).toBe(sha256(token));
    expect(saved.tokenHash).not.toBe(token);
    const me = await request(app).get("/api/v1/me").set("Cookie", sessionCookie!.split(";")[0]!);
    expect(me.status).toBe(200);
    expect(me.body.data.githubLogin).toBe("student");
  });

  it("rejects expired sessions and revokes a session on logout", async () => {
    const app = createApp(db, oauth, config);
    const a = await createUserSession("1");
    await db.session.update({ where: { tokenHash: sha256("test-token-1") }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await request(app).get("/api/v1/me").set("Cookie", a.cookie)).status).toBe(401);
    await db.session.update({ where: { tokenHash: sha256("test-token-1") }, data: { expiresAt: new Date(Date.now() + 60_000) } });
    expect((await request(app).post("/auth/logout").set("Origin", origin).set("Cookie", a.cookie)).status).toBe(200);
    expect((await request(app).get("/api/v1/me").set("Cookie", a.cookie)).status).toBe(401);
  });
});
