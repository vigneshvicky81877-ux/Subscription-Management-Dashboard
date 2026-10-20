import { formatDuration, formatPrice } from '../utils/format';
import Button from './ui/Button';
import { CheckIcon, SparklesIcon } from './ui/Icons';

export default function PlanCard({ plan, isCurrent, action }) {
  const highlighted = plan.isPopular;
  return (
    <article
      className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${
        isCurrent
          ? 'border-emerald-400 ring-2 ring-emerald-400/40 dark:border-emerald-500'
          : highlighted
            ? 'border-brand-500 ring-2 ring-brand-500/30'
            : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      {(highlighted || isCurrent) && (
        <span
          className={`absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white shadow ${
            isCurrent ? 'bg-emerald-500' : 'bg-brand-600'
          }`}
        >
          {isCurrent ? (
            <>
              <CheckIcon className="h-3.5 w-3.5" /> Current plan
            </>
          ) : (
            <>
              <SparklesIcon className="h-3.5 w-3.5" /> Most popular
            </>
          )}
        </span>
      )}

      <h3 className="text-lg font-semibold">{plan.name}</h3>
      <p className="mt-1 min-h-[2.5rem] text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>

      <p className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight">
          {Number(plan.price) === 0 ? 'Free' : formatPrice(plan.price, plan.currency)}
        </span>
        <span className="text-sm text-slate-500">/ {formatDuration(plan.durationDays)}</span>
      </p>
      <p className="mt-1 text-xs text-slate-400">{plan.durationDays}-day billing period</p>

      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
            <span className="text-slate-700 dark:text-slate-300">{f}</span>
          </li>
        ))}
      </ul>

      <Button
        className="mt-8 w-full"
        variant={action.variant ?? (highlighted ? 'primary' : 'secondary')}
        disabled={action.disabled}
        loading={action.loading}
        onClick={action.onClick}
      >
        {action.label}
      </Button>
    </article>
  );
}
