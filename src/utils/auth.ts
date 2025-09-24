import jwt, { JwtPayload } from "jsonwebtoken";

export type JwtPair = { accessToken: string; refreshToken: string };

export function signJwt(
  jwtSecret: string,
  payload?: string | Buffer | object,
  signOptions?: jwt.SignOptions,
): string {
  return jwt.sign(
    payload ?? {},
    jwtSecret,
    signOptions ?? { expiresIn: "10m" },
  );
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
