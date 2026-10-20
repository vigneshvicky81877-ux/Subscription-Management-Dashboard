import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { logoutRequest, refreshSession, setAccessToken, toApiError } from '../../api/client';
import { authApi, userApi } from '../../api/endpoints';

const initialState = {
  user: null,
  // true once the startup silent refresh has finished (success or not)
  initialized: false,
  status: 'idle', // idle | loading | succeeded | failed
  error: null,
  sessionExpired: false,
};

const withSession = (data) => {
  setAccessToken(data.accessToken);
  return data.user;
};

export const initializeAuth = createAsyncThunk('auth/initialize', async () => {
  try {
    const { user } = await refreshSession();
    return user;
  } catch {
    return null; // not signed in; not an error
  }
});

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await authApi.login(credentials);
    return withSession(data);
  } catch (err) {
    return rejectWithValue(toApiError(err));
  }
});

export const registerUser = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await authApi.register(payload);
    return withSession(data);
  } catch (err) {
    return rejectWithValue(toApiError(err));
  }
});

export const fetchCurrentUser = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authApi.me();
    return data.user;
  } catch (err) {
    return rejectWithValue(toApiError(err));
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    await logoutRequest();
  } catch {
    // Clear local state even if the server call fails.
  }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await userApi.updateProfile(payload);
    return data.user;
  } catch (err) {
    return rejectWithValue(toApiError(err));
  }
});

export const changePassword = createAsyncThunk('auth/changePassword', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await userApi.changePassword(payload);
    return withSession(data);
  } catch (err) {
    return rejectWithValue(toApiError(err));
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    tokenRefreshed(state, action) {
      if (action.payload) state.user = action.payload;
    },
    sessionExpired(state) {
      if (state.user) state.sessionExpired = true;
      state.user = null;
      state.status = 'idle';
    },
    clearAuthError(state) {
      state.error = null;
      state.status = 'idle';
    },
    clearSessionExpired(state) {
      state.sessionExpired = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.initialized = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(logoutUser.fulfilled, () => ({ ...initialState, initialized: true }))
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.user = action.payload;
      });

    // Shared loading/error handling for the credential forms.
    for (const thunk of [loginUser, registerUser]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.status = 'loading';
          state.error = null;
          state.sessionExpired = false;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.status = 'succeeded';
          state.user = action.payload;
          state.initialized = true;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.status = 'failed';
          state.error = action.payload ?? { message: action.error.message };
        });
    }
  },
});

export const { tokenRefreshed, sessionExpired, clearAuthError, clearSessionExpired } = authSlice.actions;

export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => Boolean(state.auth.user);
export const selectIsAdmin = (state) => state.auth.user?.role === 'ADMIN';

export default authSlice.reducer;
