import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toApiError } from '../../api/client';
import { subscriptionApi } from '../../api/endpoints';
import { logoutUser, sessionExpired } from '../auth/authSlice';

const initialState = {
  status: 'NONE', // ACTIVE | EXPIRED | CANCELLED | NONE
  current: null,
  loadState: 'idle', // idle | loading | succeeded | failed
  loaded: false,
  error: null,
  mutating: false,
};

const thunk = (type, fn) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (err) {
      return rejectWithValue(toApiError(err));
    }
  });

export const fetchMySubscription = thunk('subscription/fetchMine', async () => {
  const { data } = await subscriptionApi.mine();
  return data;
});

export const subscribeToPlan = thunk('subscription/subscribe', async (planId) => {
  const res = await subscriptionApi.subscribe(planId);
  return { subscription: res.data.subscription, message: res.message };
});

export const changePlan = thunk('subscription/changePlan', async (planId) => {
  const res = await subscriptionApi.changePlan(planId);
  return { subscription: res.data.subscription, message: res.message };
});

export const cancelSubscription = thunk('subscription/cancel', async () => {
  const res = await subscriptionApi.cancel();
  return { subscription: res.data.subscription, message: res.message };
});

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMySubscription.pending, (state) => {
        state.loadState = 'loading';
        state.error = null;
      })
      .addCase(fetchMySubscription.fulfilled, (state, action) => {
        state.loadState = 'succeeded';
        state.loaded = true;
        state.status = action.payload.status;
        state.current = action.payload.subscription;
      })
      .addCase(fetchMySubscription.rejected, (state, action) => {
        state.loadState = 'failed';
        state.error = action.payload ?? { message: action.error.message };
      })
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState);

    for (const t of [subscribeToPlan, changePlan, cancelSubscription]) {
      builder
        .addCase(t.pending, (state) => {
          state.mutating = true;
        })
        .addCase(t.fulfilled, (state, action) => {
          state.mutating = false;
          state.current = action.payload.subscription;
          state.status = action.payload.subscription.status;
          state.loaded = true;
        })
        .addCase(t.rejected, (state) => {
          state.mutating = false;
        });
    }
  },
});

export const selectSubscription = (state) => state.subscription;

export default subscriptionSlice.reducer;
