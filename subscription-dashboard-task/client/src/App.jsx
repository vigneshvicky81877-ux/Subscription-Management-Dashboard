import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute, { GuestRoute } from './components/routing/ProtectedRoute';
import { initializeAuth } from './features/auth/authSlice';
import AdminSubscriptionsPage from './pages/AdminSubscriptionsPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import PlansPage from './pages/PlansPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import { ForbiddenPage, NotFoundPage } from './pages/StatusPages';

export default function App() {
  const dispatch = useDispatch();

  // Restore the session from the HTTP-only refresh cookie on first load.
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<AppLayout />}>
        {/* Public: visitors can browse pricing before signing up. */}
        <Route path="/plans" element={<PlansPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />
        </Route>

        <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route index element={<Navigate to="subscriptions" replace />} />
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
