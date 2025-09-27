import { Request, Response } from "express";
import { StatusCodes, getReasonPhrase } from "http-status-codes";

export function respond(
  req: Request,
  res: Response,
  statusCode: number,
  data: unknown,
  error?: unknown,
) {
  res.status(statusCode).json({
    timestamp: new Date(),
    route: req.path,
    method: req.method,
    status: getReasonPhrase(statusCode),
    statusCode,
    data,
    error,
  });
}

export function respondError(
  req: Request,
  res: Response,
  err: string,
  statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
) {
  respond(req, res, statusCode, null, err);
}
