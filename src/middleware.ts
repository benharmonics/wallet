import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { verifyJwt } from "@utils/auth";
import crypto from "crypto";
import { respondError } from "./response";
import { Result } from "@utils/types/result";

export const jwtSecret = crypto.randomBytes(32).toString("hex");

// JWT check - RFC6750 `Authorization: Bearer ...` format
export function verifyAuthHeader(
  req: Request,
): Result<string | JwtPayload, string> {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return {
      ok: false,
      error: "header 'Authorization: Bearer <your JWT>' is required",
    };
  }
  const apiKey = authHeader.split("Bearer ")[1];
  const res = verifyJwt(apiKey, jwtSecret);
  if (!res.ok) {
    return {
      ok: false,
      error:
        "invalid JWT - please format your header e.g. 'Authorization: Bearer <your JWT>'",
    };
  }
  return { ok: true, data: res.decodedToken };
}

export function verifyJwtMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const result = verifyAuthHeader(req);
  if (!result.ok) {
    respondError(req, res, result.error, StatusCodes.UNAUTHORIZED);
    return;
  }
  next();
}
