import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/http.js';
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from '../utils/tokens.js';

export async function updateProfile(req, res) {
  const user = await authService.updateProfile(req.user.id, req.body);
  return sendSuccess(res, { data: { user }, message: 'Profile updated' });
}

export async function changePassword(req, res) {
  const { user, accessToken, refreshToken, refreshExpiresAt } = await authService.changePassword(
    req.user.id,
    req.body,
  );
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions(refreshExpiresAt));
  return sendSuccess(res, {
    data: { user, accessToken },
    message: 'Password changed. Other sessions have been signed out.',
  });
}
