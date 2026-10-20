import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { selectUser } from '../../features/auth/authSlice';
import { fetchMySubscription } from '../../features/subscription/subscriptionSlice';
import Navbar from './Navbar';

export default function AppLayout() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  // Load the subscription once per signed-in user so the navbar badge,
  // plans page and dashboard share the same state.
  useEffect(() => {
    if (user?.id) dispatch(fetchMySubscription());
  }, [dispatch, user?.id]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-slate-800">
        © {new Date().getFullYear()} SubDash · Subscription Management Dashboard
      </footer>
    </div>
  );
}
