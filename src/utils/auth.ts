import jwt, { JwtPayload } from "jsonwebtoken";

export type JwtPair = { accessToken: string; refreshToken: string };

export function jwtPair(
  jwtSecret: string,
  payload?: string | Buffer | object,
): JwtPair {
  return {
    accessToken: signJwt(jwtSecret, payload, { expiresIn: "10m" }),
    refreshToken: signJwt(jwtSecret, payload, { expiresIn: "1d" }),
  };
}

export function signJwt(
  jwtSecret: string,
  payload?: string | Buffer | object,
  signOptions?: jwt.SignOptions,
): string {
  return jwt.sign(payload ?? {}, jwtSecret, signOptions);
}

export type VerifyJwtResult =
  | { ok: false }
  | { decodedToken: string | JwtPayload; ok: true };

export function verifyJwt(token: string, jwtSecret: string): VerifyJwtResult {
  try {
    const decodedToken = jwt.verify(token, jwtSecret);
    return { decodedToken, ok: true };
  } catch (e) {
    return { ok: false };
  }
}
