import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { toUserDto } from '../utils/serializers.js';
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';

// Compared against when the email is unknown so response timing does not
// reveal whether an account exists.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', 10);
const REUSE_GRACE_MS = 10 * 1000;

async function issueTokens(user, tx = prisma) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, expiresAt } = signRefreshToken(user);
  await tx.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt },
  });
  return { accessToken, refreshToken, refreshExpiresAt: expiresAt };
}

export async function register({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');

  const hashed = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, password: hashed, role: 'USER' } });
    const tokens = await issueTokens(user, tx);
    return { user: toUserDto(user), ...tokens };
  });
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !valid) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  const tokens = await issueTokens(user);
  return { user: toUserDto(user), ...tokens };
}

/**
 * Rotates a refresh token: the presented token is revoked and a new pair is
 * issued. Re-use of an already revoked token signals theft, so every session
 * of that user is revoked.
 */
export async function refresh(rawToken) {
  if (!rawToken) throw ApiError.unauthorized('Refresh token missing', 'REFRESH_TOKEN_MISSING');

  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const tokenHash = hashToken(rawToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.userId !== payload.sub) {
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  if (stored.revokedAt) {
    // A token rotated a few seconds ago is most likely a benign race between
    // two tabs; anything older is treated as replay of a stolen token.
    if (Date.now() - stored.revokedAt.getTime() < REUSE_GRACE_MS) {
      throw ApiError.unauthorized('Refresh token already rotated', 'INVALID_REFRESH_TOKEN');
    }
    // Outside a transaction on purpose: the revocation must persist even
    // though the request fails.
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw ApiError.unauthorized('Refresh token reuse detected', 'INVALID_REFRESH_TOKEN');
  }

  if (stored.expiresAt <= new Date()) {
    throw ApiError.unauthorized('Refresh token expired', 'INVALID_REFRESH_TOKEN');
  }

  return prisma.$transaction(async (tx) => {
    // Conditional update guards against two concurrent refreshes both succeeding.
    const { count } = await tx.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');

    const tokens = await issueTokens(stored.user, tx);
    return { user: toUserDto(stored.user), ...tokens };
  });
}

export async function logout(rawToken) {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function updateProfile(userId, { name }) {
  const user = await prisma.user.update({ where: { id: userId }, data: { name } });
  return toUserDto(user);
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    throw new ApiError(400, 'INVALID_PASSWORD', 'Current password is incorrect', [
      { field: 'currentPassword', message: 'Current password is incorrect' },
    ]);
  }

  const hashed = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  // Changing the password signs out every other session.
  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { password: hashed } });
    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const tokens = await issueTokens(user, tx);
    return { user: toUserDto(user), ...tokens };
  });
}

export async function purgeExpiredRefreshTokens() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await prisma.refreshToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }] },
  });
  return count;
}
