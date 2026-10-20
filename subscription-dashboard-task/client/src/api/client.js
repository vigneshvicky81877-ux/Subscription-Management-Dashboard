import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

/**
 * Access token lives only in memory (never localStorage) to limit XSS impact.
 * The refresh token is an HTTP-only cookie the browser sends to /api/auth.
 */
let accessToken = null;
let refreshPromise = null;
let refreshTimer = null;
let handlers = { onRefreshed: () => {}, onSessionExpired: () => {} };

export const api = axios.create({ baseURL, withCredentials: true, timeout: 15000 });

// Separate instance without interceptors so refresh calls never recurse.
const authApi = axios.create({ baseURL, withCredentials: true, timeout: 15000 });

export function configureAuthHandlers(next) {
  handlers = { ...handlers, ...next };
}

export function getAccessToken() {
  return accessToken;
}

function decodeExp(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function scheduleSilentRefresh(token) {
  clearTimeout(refreshTimer);
  const exp = token && decodeExp(token);
  if (!exp) return;
  // Refresh one minute before expiry (at least 5s from now).
  const delay = Math.max(exp - Date.now() - 60_000, 5_000);
  refreshTimer = setTimeout(() => {
    refreshSession().catch(() => {});
  }, delay);
}

export function setAccessToken(token) {
  accessToken = token;
  if (token) scheduleSilentRefresh(token);
  else clearTimeout(refreshTimer);
}

/**
 * Single-flight refresh: concurrent callers (parallel 401s, StrictMode double
 * effects, the silent timer) share one request so the rotated refresh token
 * is never presented twice.
 */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = authApi
      .post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.data.accessToken);
        handlers.onRefreshed(data.data.user);
        return data.data;
      })
      .catch((err) => {
        setAccessToken(null);
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function logoutRequest() {
  try {
    await authApi.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

const NO_RETRY_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const skip = NO_RETRY_PATHS.some((p) => original?.url?.endsWith(p));

    if (status === 401 && original && !original._retry && !skip) {
      original._retry = true;
      try {
        await refreshSession();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        handlers.onSessionExpired();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

/** Normalises API/network errors into { message, code, details, status }. */
export function toApiError(err) {
  if (err?.response?.data?.error) {
    const { message, code, details } = err.response.data.error;
    return { message, code, details: details ?? null, status: err.response.status };
  }
  if (err?.code === 'ECONNABORTED') {
    return { message: 'The request timed out. Please try again.', code: 'TIMEOUT', details: null, status: 0 };
  }
  if (err?.request && !err.response) {
    return {
      message: 'Unable to reach the server. Check your connection.',
      code: 'NETWORK_ERROR',
      details: null,
      status: 0,
    };
  }
  return { message: err?.message || 'Something went wrong', code: 'UNKNOWN', details: null, status: 0 };
}
