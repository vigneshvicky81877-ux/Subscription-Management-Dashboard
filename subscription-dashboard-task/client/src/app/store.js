import { configureStore } from '@reduxjs/toolkit';
import { configureAuthHandlers } from '../api/client';
import authReducer, { sessionExpired, tokenRefreshed } from '../features/auth/authSlice';
import subscriptionReducer from '../features/subscription/subscriptionSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    subscription: subscriptionReducer,
  },
});

// Wire the Axios layer to Redux without a circular import.
configureAuthHandlers({
  onRefreshed: (user) => store.dispatch(tokenRefreshed(user)),
  onSessionExpired: () => store.dispatch(sessionExpired()),
});
