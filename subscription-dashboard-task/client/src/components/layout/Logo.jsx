import { Link } from 'react-router-dom';

export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-bold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white shadow-sm">S</span>
      <span className="text-lg">
        Sub<span className="text-brand-600 dark:text-brand-400">Dash</span>
      </span>
    </Link>
  );
}
