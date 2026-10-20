import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/http.js';
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from '../utils/tokens.js';

// The refresh token only ever travels in an HTTP-only cookie; the access token
// is returned in the body and kept in memory by the client.
function sendSession(res, { user, accessToken, refreshToken, refreshExpiresAt }, status = 200, message) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions(refreshExpiresAt));
  return sendSuccess(res, { status, data: { user, accessToken }, message });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
}

export async function register(req, res) {
  const session = await authService.register(req.body);
  return sendSession(res, session, 201, 'Account created successfully');
}

export async function login(req, res) {
  const session = await authService.login(req.body);
  return sendSession(res, session, 200, 'Logged in successfully');
}

export async function refresh(req, res) {
  try {
    const session = await authService.refresh(req.cookies?.[REFRESH_COOKIE_NAME]);
    return sendSession(res, session);
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
}

export async function logout(req, res) {
  await authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
  clearRefreshCookie(res);
  return sendSuccess(res, { message: 'Logged out successfully' });
}

export async function me(req, res) {
  return sendSuccess(res, { data: { user: req.user } });
}
