import { useCallback, useEffect, useState } from 'react';
import { toApiError } from '../api/client';
import { adminApi, planApi } from '../api/endpoints';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { SearchIcon, UsersIcon, WalletIcon, CheckIcon, AlertIcon } from '../components/ui/Icons';
import Spinner from '../components/ui/Spinner';
import StatusBadge from '../components/ui/StatusBadge';
import { useDebounce } from '../hooks/useDebounce';
import { formatDate, formatPrice, initials } from '../utils/format';

const PAGE_SIZE = 10;

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900';

function StatCard({ icon: Icon, label, value, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <span className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

export default function AdminSubscriptionsPage() {
  const [filters, setFilters] = useState({ search: '', status: '', planId: '', sortBy: 'createdAt', order: 'desc' });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(filters.search);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);

  // Reset to page 1 whenever filters change.
  useEffect(() => setPage(1), [debouncedSearch, filters.status, filters.planId, filters.sortBy, filters.order]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        sortBy: filters.sortBy,
        order: filters.order,
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.planId ? { planId: filters.planId } : {}),
      };
      const res = await adminApi.subscriptions(params);
      setRows(res.data.subscriptions);
      setMeta(res.meta);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters.status, filters.planId, filters.sortBy, filters.order]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminApi
      .stats()
      .then((res) => setStats(res.data.stats))
      .catch(() => setStats(null));
    planApi
      .list()
      .then((res) => setPlans(res.data.plans))
      .catch(() => setPlans([]));
  }, []);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const hasFilters = filters.search || filters.status || filters.planId;
  const from = meta.total === 0 ? 0 : (meta.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(meta.page * PAGE_SIZE, meta.total);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-slate-500">Admin</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">All subscriptions</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Monitor every customer subscription across all plans.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UsersIcon} label="Customers" value={stats?.totalUsers ?? '—'} tone="slate" />
        <StatCard icon={CheckIcon} label="Active" value={stats?.byStatus.ACTIVE ?? '—'} tone="emerald" />
        <StatCard icon={AlertIcon} label="Expired / cancelled" value={stats ? stats.byStatus.EXPIRED + stats.byStatus.CANCELLED : '—'} tone="amber" />
        <StatCard
          icon={WalletIcon}
          label="Active revenue"
          value={stats ? formatPrice(stats.activeRevenue) : '—'}
          tone="brand"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={filters.search}
              onChange={set('search')}
              placeholder="Search by customer name or email…"
              aria-label="Search subscriptions"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <select value={filters.status} onChange={set('status')} className={selectClass} aria-label="Filter by status">
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select value={filters.planId} onChange={set('planId')} className={selectClass} aria-label="Filter by plan">
              <option value="">All plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={`${filters.sortBy}:${filters.order}`}
              onChange={(e) => {
                const [sortBy, order] = e.target.value.split(':');
                setFilters((f) => ({ ...f, sortBy, order }));
              }}
              className={`${selectClass} col-span-2 sm:col-span-1`}
              aria-label="Sort"
            >
              <option value="createdAt:desc">Newest first</option>
              <option value="createdAt:asc">Oldest first</option>
              <option value="endDate:asc">Ending soonest</option>
              <option value="endDate:desc">Ending latest</option>
            </select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="col-span-2 sm:col-span-1"
                onClick={() => setFilters((f) => ({ ...f, search: '', status: '', planId: '' }))}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {error ? (
          <div className="p-6">
            <Alert
              type="error"
              title="Couldn't load subscriptions"
              action={
                <Button size="sm" variant="secondary" onClick={load}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            {loading && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-white/60 dark:bg-slate-900/60">
                <Spinner className="h-6 w-6 text-brand-600" />
              </div>
            )}
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Start date</th>
                  <th className="px-4 py-3 font-medium">End date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-slate-500">
                      {hasFilters ? 'No subscriptions match your filters.' : 'No subscriptions yet.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {initials(s.user.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{s.user.name}</p>
                            <p className="truncate text-xs text-slate-500">{s.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{s.plan.name}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatPrice(s.amount, s.plan.currency)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(s.startDate)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                        {formatDate(s.endDate)}
                        {s.status === 'ACTIVE' && (
                          <span className="block text-xs text-slate-400">{s.daysRemaining} days left</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm dark:border-slate-800 sm:flex-row">
          <p className="text-slate-500">
            Showing <span className="font-medium text-slate-900 dark:text-white">{from}</span>–
            <span className="font-medium text-slate-900 dark:text-white">{to}</span> of{' '}
            <span className="font-medium text-slate-900 dark:text-white">{meta.total}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="px-2 text-slate-500">
              Page {meta.page} of {meta.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= meta.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
