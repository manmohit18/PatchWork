import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export function sendError(error: unknown, _request: Request, response: Response, _next: NextFunction): void {
  void _next;
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    response.status(400).json({ error: { code: "INVALID_JSON", message: "Invalid JSON body" } });
    return;
  }
  if (error instanceof ZodError) {
    response.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid request", details: error.flatten() } });
    return;
  }
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }) } });
    return;
  }
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
    response.status(409).json({ error: { code: "CONFLICT", message: "A record with this value already exists" } });
    return;
  }
  console.error("Request failed", error instanceof Error ? error.constructor.name : "unknown error");
  response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
}

export function requireSameOrigin(appOrigin: string) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (request.get("origin") !== appOrigin) {
      next(new HttpError(403, "INVALID_ORIGIN", "Request origin is not allowed"));
      return;
    }
    next();
  };
}
