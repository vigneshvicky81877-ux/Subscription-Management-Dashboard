import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/tokens.js';

/**
 * Verifies the Bearer access token and loads the user from the database so
 * deleted accounts and role changes take effect immediately.
 */
export async function authenticate(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Missing or malformed Authorization header');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Access token expired', 'TOKEN_EXPIRED');
      }
      throw ApiError.unauthorized('Invalid access token', 'INVALID_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) throw ApiError.unauthorized('User no longer exists', 'INVALID_TOKEN');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Role-based access guard. Must run after `authenticate`. */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}
