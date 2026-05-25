import jwt from "jsonwebtoken";
import type { Response } from "express";
import { config, isProduction } from "../config.js";

const cookieName = "access_token";

export function signSession(userId: string) {
  return jwt.sign({ sub: userId }, config.JWT_SECRET, { expiresIn: "8h" });
}

export function verifySession(token: string) {
  return jwt.verify(token, config.JWT_SECRET) as { sub: string };
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    domain: isProduction ? config.COOKIE_DOMAIN : undefined,
    maxAge: 8 * 60 * 60 * 1000,
    path: "/"
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(cookieName, {
    domain: isProduction ? config.COOKIE_DOMAIN : undefined,
    path: "/"
  });
}

export { cookieName };
