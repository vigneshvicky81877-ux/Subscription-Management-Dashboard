import { describe, expect, it } from 'vitest';
import authReducer, {
  initializeAuth,
  loginUser,
  logoutUser,
  sessionExpired,
} from '../features/auth/authSlice';
import subscriptionReducer, { fetchMySubscription } from '../features/subscription/subscriptionSlice';
import { compact, fieldErrorsFrom, validatePassword } from '../utils/validation';

const user = { id: 'u1', name: 'Jane', email: 'jane@example.com', role: 'USER' };

describe('authSlice', () => {
  it('marks the session initialised after the startup refresh', () => {
    const state = authReducer(undefined, initializeAuth.fulfilled(null, 'r'));
    expect(state.initialized).toBe(true);
    expect(state.user).toBeNull();
  });

  it('tracks login loading, success and failure', () => {
    let state = authReducer(undefined, loginUser.pending('r', {}));
    expect(state.status).toBe('loading');
    state = authReducer(state, loginUser.fulfilled(user, 'r', {}));
    expect(state.user).toEqual(user);
    expect(state.status).toBe('succeeded');

    const failed = authReducer(
      undefined,
      loginUser.rejected(null, 'r', {}, { message: 'Invalid email or password' }),
    );
    expect(failed.status).toBe('failed');
    expect(failed.error.message).toBe('Invalid email or password');
  });

  it('clears the user on logout and flags expired sessions', () => {
    const signedIn = authReducer(undefined, loginUser.fulfilled(user, 'r', {}));
    expect(authReducer(signedIn, logoutUser.fulfilled(undefined, 'r')).user).toBeNull();
    const expired = authReducer(signedIn, sessionExpired());
    expect(expired.user).toBeNull();
    expect(expired.sessionExpired).toBe(true);
  });
});

describe('subscriptionSlice', () => {
  it('stores the fetched subscription and resets on logout', () => {
    const payload = { status: 'ACTIVE', subscription: { id: 's1', status: 'ACTIVE' } };
    const state = subscriptionReducer(undefined, fetchMySubscription.fulfilled(payload, 'r'));
    expect(state.status).toBe('ACTIVE');
    expect(state.loaded).toBe(true);
    const reset = subscriptionReducer(state, logoutUser.fulfilled(undefined, 'r'));
    expect(reset.status).toBe('NONE');
    expect(reset.current).toBeNull();
  });
});

describe('validation helpers', () => {
  it('mirrors the server password policy', () => {
    expect(validatePassword('short1')).toMatch(/8 characters/);
    expect(validatePassword('lettersonly')).toMatch(/number/);
    expect(validatePassword('secret123')).toBeNull();
  });

  it('maps server field errors', () => {
    expect(fieldErrorsFrom({ details: [{ field: 'email', message: 'bad' }] })).toEqual({ email: 'bad' });
    expect(compact({ a: null, b: 'x' })).toEqual({ b: 'x' });
  });
});
