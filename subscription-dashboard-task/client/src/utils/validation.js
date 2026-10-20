// Client-side checks mirror the server's Zod rules for instant feedback.
// The server remains the source of truth.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 72) return 'Password must be at most 72 characters';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain a letter';
  if (!/\d/.test(password)) return 'Password must contain a number';
  return null;
}

export function validateName(name) {
  const n = name.trim();
  if (!n) return 'Name is required';
  if (n.length < 2) return 'Name must be at least 2 characters';
  if (n.length > 100) return 'Name must be at most 100 characters';
  return null;
}

/** Converts server `details: [{ field, message }]` into { field: message }. */
export function fieldErrorsFrom(apiError) {
  const out = {};
  for (const d of apiError?.details ?? []) {
    if (d.field && !out[d.field]) out[d.field] = d.message;
  }
  return out;
}

export function compact(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
}
