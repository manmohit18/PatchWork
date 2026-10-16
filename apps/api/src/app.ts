import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import type { PrismaClient } from "@patchwork/db";
import { createTaskSchema, createWorkspaceSchema } from "@patchwork/contracts";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import { HttpError, requireSameOrigin, sendError } from "./http.js";
import { codeChallenge, equalTokens, randomUrlToken, type OAuthGateway } from "./oauth.js";
import { attachUser, createSession, SESSION_COOKIE } from "./session.js";
import { createTask, createWorkspace, listTasks, listWorkspaces } from "./services.js";

const TX_COOKIE_AGE_MS = 10 * 60 * 1000;
const idSchema = z.uuid();

export function createApp(db: PrismaClient, oauth: OAuthGateway, config: AppConfig): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());
  const sameOrigin = requireSameOrigin(config.appOrigin);
  const auth = attachUser(db);

  app.get("/auth/github/start", (_request, response) => {
    const state = randomUrlToken();
    const verifier = randomUrlToken();
    const options = { httpOnly: true, secure: config.secureCookies, sameSite: "lax" as const, path: "/auth/github", maxAge: TX_COOKIE_AGE_MS };
    response.cookie("patchwork_oauth_state", state, options);
    response.cookie("patchwork_oauth_verifier", verifier, options);
    response.redirect(oauth.authorizationUrl(state, codeChallenge(verifier)));
  });

  app.get("/auth/github/callback", async (request, response, next) => {
    try {
      const stateCookie = request.cookies?.patchwork_oauth_state as string | undefined;
      const verifier = request.cookies?.patchwork_oauth_verifier as string | undefined;
      const state = request.query.state;
      const code = request.query.code;
      response.clearCookie("patchwork_oauth_state", { path: "/auth/github" });
      response.clearCookie("patchwork_oauth_verifier", { path: "/auth/github" });
      if (typeof state !== "string" || typeof code !== "string" || !stateCookie || !verifier || !equalTokens(stateCookie, state)) {
        throw new HttpError(400, "INVALID_OAUTH_CALLBACK", "Sign-in could not be verified");
      }
      const accessToken = await oauth.exchangeCode(code, verifier);
      const profile = await oauth.fetchProfile(accessToken);
      const user = await db.user.upsert({
        where: { githubId: String(profile.id) },
        create: { githubId: String(profile.id), githubLogin: profile.login, name: profile.name, email: profile.email, avatarUrl: profile.avatar_url },
        update: { githubLogin: profile.login, name: profile.name, email: profile.email, avatarUrl: profile.avatar_url },
      });
      await createSession(db, response, user.id, config);
      response.redirect(`${config.appOrigin}/workspaces`);
    } catch (error) { next(error); }
  });

  app.post("/auth/logout", sameOrigin, auth, async (_request, response, next) => {
    try {
      await db.session.update({ where: { id: response.locals.sessionId as string }, data: { revokedAt: new Date() } });
      response.clearCookie(SESSION_COOKIE, { path: "/" });
      response.json({ data: { signedOut: true } });
    } catch (error) { next(error); }
  });

  app.use("/api/v1", auth);
  app.get("/api/v1/me", (_request, response) => {
    const user = response.locals.user as { id: string; githubLogin: string; name: string | null; avatarUrl: string | null };
    response.json({ data: { id: user.id, githubLogin: user.githubLogin, name: user.name, avatarUrl: user.avatarUrl } });
  });

  app.get("/api/v1/workspaces", async (_request, response, next) => {
    try {
      const user = response.locals.user as { id: string };
      response.json({ data: await listWorkspaces(db, user.id) });
    } catch (error) { next(error); }
  });
  app.post("/api/v1/workspaces", sameOrigin, async (request, response, next) => {
    try {
      const user = response.locals.user as { id: string };
      const input = createWorkspaceSchema.parse(request.body);
      const workspace = await createWorkspace(db, user.id, input);
      response.status(201).json({ data: { ...workspace, role: "OWNER" } });
    } catch (error) { next(error); }
  });

  app.get("/api/v1/workspaces/:workspaceId/tasks", async (request, response, next) => {
    try {
      const user = response.locals.user as { id: string };
      const workspaceId = idSchema.parse(request.params.workspaceId);
      const cursor = request.query.cursor === undefined ? undefined : idSchema.parse(request.query.cursor);
      response.json({ data: await listTasks(db, workspaceId, user.id, cursor) });
    } catch (error) { next(error); }
  });
  app.post("/api/v1/workspaces/:workspaceId/tasks", sameOrigin, async (request, response, next) => {
    try {
      const user = response.locals.user as { id: string };
      const workspaceId = idSchema.parse(request.params.workspaceId);
      const input = createTaskSchema.parse(request.body);
      const task = await createTask(db, workspaceId, user.id, input);
      response.status(201).json({ data: { ...task, dueDate: task.dueDate?.toISOString().slice(0, 10) ?? null } });
    } catch (error) { next(error); }
  });

  app.use(sendError);
  return app;
}
