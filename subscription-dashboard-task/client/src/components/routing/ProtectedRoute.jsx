import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectAuth } from '../../features/auth/authSlice';
import { PageLoader } from '../ui/Spinner';

/**
 * Guards child routes. Unauthenticated users go to /login (remembering where
 * they were headed); authenticated users without the role see /forbidden.
 */
export default function ProtectedRoute({ roles }) {
  const { user, initialized } = useSelector(selectAuth);
  const location = useLocation();

  if (!initialized) return <PageLoader label="Restoring your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/forbidden" replace />;

  return <Outlet />;
}

/** Routes only for signed-out visitors (login, register). */
export function GuestRoute() {
  const { user, initialized } = useSelector(selectAuth);
  const location = useLocation();

  if (!initialized) return <PageLoader label="Restoring your session…" />;
  if (user) {
    const from = location.state?.from?.pathname;
    return <Navigate to={from && from !== '/login' ? from : '/dashboard'} replace />;
  }
  return <Outlet />;
}
