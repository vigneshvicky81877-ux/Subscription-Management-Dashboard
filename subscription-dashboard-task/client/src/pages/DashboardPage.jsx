import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toApiError } from '../api/client';
import { subscriptionApi } from '../api/endpoints';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { CalendarIcon, CheckIcon, TagIcon, WalletIcon } from '../components/ui/Icons';
import { PageLoader } from '../components/ui/Spinner';
import StatusBadge from '../components/ui/StatusBadge';
import { selectUser } from '../features/auth/authSlice';
import {
  cancelSubscription,
  fetchMySubscription,
  selectSubscription,
} from '../features/subscription/subscriptionSlice';
import { formatDate, formatDuration, formatPrice } from '../utils/format';

const linkButton =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition';
const primaryLink = `${linkButton} bg-brand-600 text-white hover:bg-brand-700`;
const secondaryLink = `${linkButton} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`;

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function CurrentPlanCard({ status, subscription, onCancel }) {
  if (status === 'NONE' || !subscription) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <TagIcon />
        </div>
        <h2 className="mt-4 text-lg font-semibold">You don&apos;t have a plan yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Choose a plan to unlock projects, storage and support. You can start with the Free plan.
        </p>
        <Link to="/plans" className={`${primaryLink} mt-6`}>
          Browse plans
        </Link>
      </section>
    );
  }

  const { plan } = subscription;
  const isActive = status === 'ACTIVE';
  const totalDays = plan.durationDays;
  const used = isActive ? Math.min(100, Math.round(((totalDays - subscription.daysRemaining) / totalDays) * 100)) : 100;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-6 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{plan.name} plan</h2>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
        </div>
        <p className="text-right">
          <span className="text-2xl font-bold">{formatPrice(subscription.amount, plan.currency)}</span>
          <span className="text-sm text-slate-500"> / {formatDuration(plan.durationDays)}</span>
        </p>
      </div>

      {!isActive && (
        <div className="px-6 pt-6">
          <Alert type={status === 'EXPIRED' ? 'warning' : 'info'}>
            {status === 'EXPIRED'
              ? `Your ${plan.name} subscription expired on ${formatDate(subscription.endDate)}. Renew to restore access.`
              : `Your ${plan.name} subscription was cancelled on ${formatDate(subscription.cancelledAt)}.`}
          </Alert>
        </div>
      )}

      <div className="grid gap-4 p-6 sm:grid-cols-3">
        <StatTile icon={CalendarIcon} label="Started" value={formatDate(subscription.startDate)} />
        <StatTile
          icon={CalendarIcon}
          label={isActive ? 'Renews / ends' : 'Ended'}
          value={formatDate(subscription.endDate)}
        />
        <StatTile
          icon={WalletIcon}
          label="Days remaining"
          value={isActive ? subscription.daysRemaining : 0}
          sub={`of ${totalDays} days`}
        />
      </div>

      {isActive && (
        <div className="px-6">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Billing period used</span>
            <span>{used}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full ${used > 85 ? 'bg-amber-500' : 'bg-brand-600'}`}
              style={{ width: `${used}%` }}
            />
          </div>
        </div>
      )}

      <div className="p-6">
        <h3 className="text-sm font-semibold">Included features</h3>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <CheckIcon className="h-4 w-4 text-emerald-500" /> {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:justify-end">
        {isActive ? (
          <>
            <Button variant="ghost" className="text-rose-600 dark:text-rose-400" onClick={onCancel}>
              Cancel subscription
            </Button>
            <Link to="/plans" className={primaryLink}>
              Change plan
            </Link>
          </>
        ) : (
          <Link to="/plans" className={primaryLink}>
            {status === 'EXPIRED' ? 'Renew subscription' : 'Choose a plan'}
          </Link>
        )}
      </div>
    </section>
  );
}

function HistoryTable({ items }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-slate-500">No subscription history yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-4 font-medium">Plan</th>
            <th className="py-2 pr-4 font-medium">Amount</th>
            <th className="py-2 pr-4 font-medium">Period</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((s) => (
            <tr key={s.id}>
              <td className="py-3 pr-4 font-medium">{s.plan.name}</td>
              <td className="py-3 pr-4">{formatPrice(s.amount, s.plan.currency)}</td>
              <td className="whitespace-nowrap py-3 pr-4 text-slate-500">
                {formatDate(s.startDate)} – {formatDate(s.endDate)}
              </td>
              <td className="py-3">
                <StatusBadge status={s.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const { status, current, loadState, loaded, error, mutating } = useSelector(selectSubscription);

  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [flash, setFlash] = useState(location.state?.flash ?? null);

  useEffect(() => {
    // Drop the one-time flash message from history state.
    if (location.state?.flash) navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await subscriptionApi.history();
      setHistory(data.subscriptions);
      setHistoryError(null);
    } catch (err) {
      setHistoryError(toApiError(err).message);
    }
  }, []);

  useEffect(() => {
    dispatch(fetchMySubscription());
    loadHistory();
  }, [dispatch, loadHistory]);

  const doCancel = async () => {
    const result = await dispatch(cancelSubscription());
    setConfirmCancel(false);
    setFlash(
      cancelSubscription.fulfilled.match(result)
        ? result.payload.message
        : null,
    );
    if (cancelSubscription.rejected.match(result)) {
      setHistoryError(result.payload?.message ?? 'Could not cancel subscription');
    }
    loadHistory();
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Dashboard</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hi, {user.name.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Here&apos;s an overview of your subscription.</p>
        </div>
        <Link to="/plans" className={secondaryLink}>
          View all plans
        </Link>
      </header>

      {flash && (
        <Alert type="success" onClose={() => setFlash(null)}>
          {flash}
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {!loaded && loadState !== 'failed' ? (
            <PageLoader label="Loading your subscription…" />
          ) : loadState === 'failed' && !loaded ? (
            <Alert
              type="error"
              title="Couldn't load your subscription"
              action={
                <Button size="sm" variant="secondary" onClick={() => dispatch(fetchMySubscription())}>
                  Retry
                </Button>
              }
            >
              {error?.message}
            </Alert>
          ) : (
            <CurrentPlanCard status={status} subscription={current} onCancel={() => setConfirmCancel(true)} />
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Subscription history</h2>
            {historyError ? (
              <Alert type="error" className="mt-4">
                {historyError}
              </Alert>
            ) : (
              <div className="mt-4">
                <HistoryTable items={history} />
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Account</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="font-medium">{user.name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="break-all font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Role</dt>
                <dd className="font-medium capitalize">{user.role.toLowerCase()}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Member since</dt>
                <dd className="font-medium">{formatDate(user.createdAt)}</dd>
              </div>
            </dl>
            <Link to="/profile" className={`${secondaryLink} mt-6 w-full`}>
              Edit profile
            </Link>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel your subscription?"
        confirmLabel="Yes, cancel"
        confirmVariant="danger"
        loading={mutating}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={doCancel}
      >
        Your {current?.plan?.name} plan will end immediately and you&apos;ll lose access to its features. You can
        subscribe again at any time.
      </ConfirmDialog>
    </div>
  );
}
