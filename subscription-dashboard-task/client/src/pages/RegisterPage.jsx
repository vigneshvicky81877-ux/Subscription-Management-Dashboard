import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import { clearAuthError, registerUser, selectAuth } from '../features/auth/authSlice';
import {
  compact,
  fieldErrorsFrom,
  validateEmail,
  validateName,
  validatePassword,
} from '../utils/validation';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const { status, error } = useSelector(selectAuth);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [e.target.name]: null }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errors = compact({
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirmPassword: form.password !== form.confirmPassword ? 'Passwords do not match' : null,
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    const result = await dispatch(
      registerUser({ name: form.name.trim(), email: form.email.trim(), password: form.password }),
    );
    if (registerUser.rejected.match(result)) {
      const serverErrors = fieldErrorsFrom(result.payload);
      if (result.payload?.code === 'EMAIL_TAKEN') serverErrors.email = result.payload.message;
      setFieldErrors(serverErrors);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start on the Free plan and upgrade whenever you're ready."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {error && status === 'failed' && error.code !== 'VALIDATION_ERROR' && (
          <Alert type="error" onClose={() => dispatch(clearAuthError())}>
            {error.message}
          </Alert>
        )}
        <FormField
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Jane Doe"
          value={form.name}
          onChange={onChange}
          error={fieldErrors.name}
          autoFocus
        />
        <FormField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={onChange}
          error={fieldErrors.email}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          hint="Use 8+ characters with at least one letter and one number."
          value={form.password}
          onChange={onChange}
          error={fieldErrors.password}
        />
        <FormField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={onChange}
          error={fieldErrors.confirmPassword}
        />
        <Button type="submit" className="w-full" size="lg" loading={status === 'loading'}>
          {status === 'loading' ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
