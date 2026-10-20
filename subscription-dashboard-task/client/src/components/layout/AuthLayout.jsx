import { Link } from 'react-router-dom';
import { CheckIcon } from '../ui/Icons';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const highlights = [
  'Pick a plan that fits and switch anytime',
  'Track your subscription status and renewal dates',
  'Secure sign-in with automatic session refresh',
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
        <Link to="/plans" className="relative flex items-center gap-2 text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-brand-700">S</span>
          SubDash
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight">Manage subscriptions without the spreadsheet.</h2>
          <ul className="mt-8 space-y-4">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-3 text-brand-100">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15">
                  <CheckIcon className="h-4 w-4" />
                </span>
                {h}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-200">Trusted by teams who like their billing boring.</p>
      </aside>

      <section className="flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="lg:invisible">
            <Logo to="/plans" />
          </div>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">{footer}</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
