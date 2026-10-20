import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { logoutUser, selectIsAdmin, selectUser } from '../../features/auth/authSlice';
import { selectSubscription } from '../../features/subscription/subscriptionSlice';
import { GridIcon, LogoutIcon, MenuIcon, ShieldIcon, TagIcon, XIcon } from '../ui/Icons';
import StatusBadge from '../ui/StatusBadge';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

const linkClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
  }`;

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectUser);
  const isAdmin = useSelector(selectIsAdmin);
  const { status, loaded } = useSelector(selectSubscription);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await dispatch(logoutUser());
    setLoggingOut(false);
    navigate('/login', { replace: true });
  };

  const links = user
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: GridIcon },
        { to: '/plans', label: 'Plans', icon: TagIcon },
        ...(isAdmin ? [{ to: '/admin/subscriptions', label: 'Admin', icon: ShieldIcon }] : []),
      ]
    : [{ to: '/plans', label: 'Pricing', icon: TagIcon }];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo to={user ? '/dashboard' : '/plans'} />
          <div className="hidden items-center gap-1 md:flex">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user && loaded && (
            <Link to="/dashboard" className="hidden sm:block" title="Subscription status">
              <StatusBadge status={status} />
            </Link>
          )}
          <ThemeToggle />
          {user ? (
            <div className="hidden md:block">
              <UserMenu user={user} onLogout={handleLogout} loggingOut={loggingOut} />
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Get started
              </Link>
            </div>
          )}
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 dark:border-slate-800 dark:bg-slate-950 md:hidden">
          {user && (
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 py-3 dark:border-slate-800">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              {loaded && <StatusBadge status={status} />}
            </div>
          )}
          <div className="flex flex-col gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/profile" className={linkClass}>
                  Profile settings
                </NavLink>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <LogoutIcon className="h-4 w-4" /> {loggingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkClass}>
                  Sign in
                </NavLink>
                <NavLink to="/register" className={linkClass}>
                  Create account
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
