import { Link } from 'react-router-dom';

function StatusPage({ code, title, message }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">{code}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-md text-slate-600 dark:text-slate-400">{message}</p>
      <Link
        to="/dashboard"
        className="mt-8 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  return <StatusPage code="404" title="Page not found" message="The page you're looking for doesn't exist." />;
}

export function ForbiddenPage() {
  return (
    <StatusPage
      code="403"
      title="Access denied"
      message="This area is only available to administrators. Contact your admin if you think this is a mistake."
    />
  );
}
