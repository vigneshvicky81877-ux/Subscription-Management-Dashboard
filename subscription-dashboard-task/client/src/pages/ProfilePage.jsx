import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import { changePassword, selectUser, updateProfile } from '../features/auth/authSlice';
import { compact, fieldErrorsFrom, validateName, validatePassword } from '../utils/validation';

function Card({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 p-6 dark:border-slate-800">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function ProfileForm({ user }) {
  const dispatch = useDispatch();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    const err = validateName(name);
    setError(err);
    if (err) return;
    setSaving(true);
    const result = await dispatch(updateProfile({ name: name.trim() }));
    setSaving(false);
    if (updateProfile.fulfilled.match(result)) setMessage({ type: 'success', text: 'Profile updated.' });
    else {
      setError(fieldErrorsFrom(result.payload).name ?? null);
      setMessage({ type: 'error', text: result.payload?.message ?? 'Update failed' });
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {message && (
        <Alert type={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      <FormField label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={error} />
      <FormField label="Email address" value={user.email} disabled hint="Email cannot be changed." />
      <div className="flex justify-end">
        <Button type="submit" loading={saving} disabled={name.trim() === user.name}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const dispatch = useDispatch();
  const empty = { currentPassword: '', newPassword: '', confirm: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: null }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    const errs = compact({
      currentPassword: form.currentPassword ? null : 'Current password is required',
      newPassword: validatePassword(form.newPassword),
      confirm: form.newPassword !== form.confirm ? 'Passwords do not match' : null,
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    const result = await dispatch(
      changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    );
    setSaving(false);
    if (changePassword.fulfilled.match(result)) {
      setForm(empty);
      setMessage({ type: 'success', text: 'Password changed. Your other sessions have been signed out.' });
    } else {
      setErrors(fieldErrorsFrom(result.payload));
      setMessage({ type: 'error', text: result.payload?.message ?? 'Could not change password' });
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {message && (
        <Alert type={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      <FormField
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        value={form.currentPassword}
        onChange={onChange}
        error={errors.currentPassword}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={onChange}
          error={errors.newPassword}
        />
        <FormField
          label="Confirm new password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={onChange}
          error={errors.confirm}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          Update password
        </Button>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const user = useSelector(selectUser);
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-sm text-slate-500">Settings</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile</h1>
      </header>
      <Card title="Personal information" description="Update how your name appears across the dashboard.">
        <ProfileForm user={user} />
      </Card>
      <Card title="Password" description="Changing your password signs you out on all other devices.">
        <PasswordForm />
      </Card>
    </div>
  );
}
