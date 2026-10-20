import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { initials } from '../../utils/format';
import { ChevronDownIcon, GridIcon, LogoutIcon, UserIcon } from '../ui/Icons';

export default function UserMenu({ user, onLogout, loggingOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item =
    'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
          {initials(user.name)}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium md:block">{user.name}</span>
        <ChevronDownIcon className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 px-3 pb-3 pt-2 dark:border-slate-800">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <span className="mt-2 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {user.role}
            </span>
          </div>
          <div className="py-1">
            <Link role="menuitem" to="/dashboard" className={item} onClick={() => setOpen(false)}>
              <GridIcon className="h-4 w-4" /> Dashboard
            </Link>
            <Link role="menuitem" to="/profile" className={item} onClick={() => setOpen(false)}>
              <UserIcon className="h-4 w-4" /> Profile settings
            </Link>
          </div>
          <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
            <button
              role="menuitem"
              type="button"
              disabled={loggingOut}
              onClick={onLogout}
              className={`${item} text-rose-600 dark:text-rose-400`}
            >
              <LogoutIcon className="h-4 w-4" /> {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
