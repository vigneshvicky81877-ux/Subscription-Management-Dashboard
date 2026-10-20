const styles = {
  ACTIVE:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30',
  EXPIRED:
    'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30',
  CANCELLED:
    'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30',
  NONE: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/30',
};

const dots = {
  ACTIVE: 'bg-emerald-500',
  EXPIRED: 'bg-amber-500',
  CANCELLED: 'bg-rose-500',
  NONE: 'bg-slate-400',
};

const labels = { ACTIVE: 'Active', EXPIRED: 'Expired', CANCELLED: 'Cancelled', NONE: 'No plan' };

export default function StatusBadge({ status = 'NONE', className = '' }) {
  const key = styles[status] ? status : 'NONE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[key]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[key]}`} />
      {labels[key]}
    </span>
  );
}
