import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toApiError } from '../api/client';
import { planApi } from '../api/endpoints';
import PlanCard from '../components/PlanCard';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PageLoader } from '../components/ui/Spinner';
import { selectUser } from '../features/auth/authSlice';
import {
  changePlan,
  selectSubscription,
  subscribeToPlan,
} from '../features/subscription/subscriptionSlice';
import { formatDuration, formatPrice } from '../utils/format';

export default function PlansPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const { status: subStatus, current, mutating, loaded } = useSelector(selectSubscription);

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [pending, setPending] = useState(null); // { plan, mode: 'subscribe' | 'change' }

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await planApi.list();
      setPlans(data.plans);
    } catch (err) {
      setLoadError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const activePlan = subStatus === 'ACTIVE' ? current?.plan : null;

  const confirm = async () => {
    const { plan, mode } = pending;
    const thunk = mode === 'change' ? changePlan : subscribeToPlan;
    const result = await dispatch(thunk(plan.id));
    setPending(null);
    if (thunk.fulfilled.match(result)) {
      setFeedback({ type: 'success', message: result.payload.message });
      navigate('/dashboard', { state: { flash: result.payload.message } });
    } else {
      setFeedback({ type: 'error', message: result.payload?.message ?? 'Could not update subscription' });
    }
  };

  const actionFor = (plan) => {
    if (!user) return { label: 'Sign up to subscribe', onClick: () => navigate('/register') };
    if (!loaded) return { label: 'Loading…', disabled: true };
    if (activePlan?.id === plan.id) return { label: 'Current plan', disabled: true, variant: 'secondary' };
    if (activePlan) {
      const diff = Number(plan.price) - Number(activePlan.price);
      return {
        label: diff > 0 ? `Upgrade to ${plan.name}` : diff < 0 ? `Downgrade to ${plan.name}` : `Switch to ${plan.name}`,
        onClick: () => setPending({ plan, mode: 'change' }),
        variant: diff > 0 ? 'primary' : 'secondary',
      };
    }
    return {
      label: subStatus === 'NONE' ? `Get ${plan.name}` : `Subscribe to ${plan.name}`,
      onClick: () => setPending({ plan, mode: 'subscribe' }),
    };
  };

  return (
    <div>
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">Pricing</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Plans that grow with you</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          Start free, upgrade when you need more. Changing plans takes effect immediately.
        </p>
      </header>

      {activePlan && (
        <div className="mx-auto mt-8 max-w-3xl">
          <Alert type="info">
            You&apos;re currently on the <strong>{activePlan.name}</strong> plan. Picking another plan will
            replace it immediately.
          </Alert>
        </div>
      )}

      {feedback && (
        <div className="mx-auto mt-6 max-w-3xl">
          <Alert type={feedback.type} onClose={() => setFeedback(null)}>
            {feedback.message}
          </Alert>
        </div>
      )}

      {loading ? (
        <PageLoader label="Loading plans…" />
      ) : loadError ? (
        <div className="mx-auto mt-10 max-w-lg">
          <Alert
            type="error"
            title="Couldn't load plans"
            action={
              <Button size="sm" variant="secondary" onClick={loadPlans}>
                Retry
              </Button>
            }
          >
            {loadError}
          </Alert>
        </div>
      ) : plans.length === 0 ? (
        <p className="mt-16 text-center text-slate-500">No plans are available right now.</p>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={activePlan?.id === plan.id}
              action={{ ...actionFor(plan), loading: mutating && pending?.plan.id === plan.id }}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.mode === 'change' ? `Switch to ${pending?.plan.name}?` : `Subscribe to ${pending?.plan.name}?`}
        confirmLabel={pending?.mode === 'change' ? 'Confirm change' : 'Confirm subscription'}
        loading={mutating}
        onCancel={() => setPending(null)}
        onConfirm={confirm}
      >
        {pending && (
          <>
            <p>
              You&apos;ll be billed{' '}
              <strong className="text-slate-900 dark:text-white">
                {formatPrice(pending.plan.price, pending.plan.currency)}
              </strong>{' '}
              for {formatDuration(pending.plan.durationDays) === 'year' ? 'one year' : `${pending.plan.durationDays} days`} of
              access, starting today.
            </p>
            {pending.mode === 'change' && (
              <p className="mt-2">Your current {activePlan?.name} subscription will be cancelled.</p>
            )}
            <p className="mt-2 text-xs text-slate-500">Demo environment — no payment is taken.</p>
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
