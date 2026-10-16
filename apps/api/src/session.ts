import type { Request, Response, NextFunction } from "express";
import type { PrismaClient } from "@patchwork/db";
import type { AppConfig } from "./config.js";
import { HttpError } from "./http.js";
import { randomUrlToken, sha256 } from "./oauth.js";

export const SESSION_COOKIE = "patchwork_session";
export const SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSession(db: PrismaClient, response: Response, userId: string, config: AppConfig): Promise<void> {
  const token = randomUrlToken();
  await db.session.create({ data: { tokenHash: sha256(token), userId, expiresAt: new Date(Date.now() + SESSION_AGE_MS) } });
  response.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: config.secureCookies, sameSite: "lax", path: "/", maxAge: SESSION_AGE_MS });
}

export function attachUser(db: PrismaClient) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const token = request.cookies?.[SESSION_COOKIE] as string | undefined;
      if (!token) throw new HttpError(401, "UNAUTHENTICATED", "Sign in required");
      const session = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        throw new HttpError(401, "UNAUTHENTICATED", "Session expired or invalid");
      }
      response.locals.user = session.user;
      response.locals.sessionId = session.id;
      next();
    } catch (error) {
      next(error);
    }
  };
}
