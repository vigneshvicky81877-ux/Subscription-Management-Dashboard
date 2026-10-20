import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import { clearAuthError, clearSessionExpired, loginUser, selectAuth } from '../features/auth/authSlice';
import { compact, fieldErrorsFrom, validateEmail } from '../utils/validation';

export default function LoginPage() {
  const dispatch = useDispatch();
  const { status, error, sessionExpired } = useSelector(selectAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(
    () => () => {
      dispatch(clearAuthError());
      dispatch(clearSessionExpired());
    },
    [dispatch],
  );

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [e.target.name]: null }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errors = compact({
      email: validateEmail(form.email),
      password: form.password ? null : 'Password is required',
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    const result = await dispatch(loginUser({ email: form.email.trim(), password: form.password }));
    // On success GuestRoute redirects to the page the user originally wanted.
    if (loginUser.rejected.match(result)) setFieldErrors(fieldErrorsFrom(result.payload));
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your subscription."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {sessionExpired && (
          <Alert type="warning" onClose={() => dispatch(clearSessionExpired())}>
            Your session has expired. Please sign in again.
          </Alert>
        )}
        {error && status === 'failed' && (
          <Alert type="error" onClose={() => dispatch(clearAuthError())}>
            {error.message}
          </Alert>
        )}
        <FormField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={onChange}
          error={fieldErrors.email}
          autoFocus
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={onChange}
          error={fieldErrors.password}
        />
        <Button type="submit" className="w-full" size="lg" loading={status === 'loading'}>
          {status === 'loading' ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
