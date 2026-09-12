import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";
import { isProd } from "../config/env.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Validation failed", details: err.errors },
    });
    return;
  }
  const message = isProd ? "Internal server error" : (err as Error)?.message ?? "Internal server error";
  res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message } });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } });
}
