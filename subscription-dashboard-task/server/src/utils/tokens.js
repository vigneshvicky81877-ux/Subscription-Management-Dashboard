import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ISSUER = 'subscription-dashboard';
const DAY_MS = 24 * 60 * 60 * 1000;

export const REFRESH_COOKIE_NAME = 'refreshToken';

export function signAccessToken(user) {
  return jwt.sign({ role: user.role, type: 'access' }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.ACCESS_TOKEN_TTL,
    issuer: ISSUER,
  });
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: ISSUER,
    algorithms: ['HS256'],
  });
  if (payload.type !== 'access') throw new jwt.JsonWebTokenError('Invalid token type');
  return payload;
}

export function signRefreshToken(user) {
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS);
  const token = jwt.sign({ type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    subject: user.id,
    // jwtid makes every token unique even when issued within the same second.
    jwtid: crypto.randomUUID(),
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
    issuer: ISSUER,
  });
  return { token, expiresAt };
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: ISSUER,
    algorithms: ['HS256'],
  });
  if (payload.type !== 'refresh') throw new jwt.JsonWebTokenError('Invalid token type');
  return payload;
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.COOKIE_SAMESITE,
    path: '/api/auth',
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}
