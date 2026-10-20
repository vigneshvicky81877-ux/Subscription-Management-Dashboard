import { AlertIcon, CheckIcon, XIcon } from './Icons';

const styles = {
  error:
    'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
  info: 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-900/60 dark:bg-brand-950/40 dark:text-brand-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
};

export default function Alert({ type = 'info', title, children, onClose, action, className = '' }) {
  if (!children && !title) return null;
  const Icon = type === 'success' ? CheckIcon : AlertIcon;
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${styles[type]} ${className}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {action}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
