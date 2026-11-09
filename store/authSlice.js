// Who is logged in. Filled automatically when /auth/me or /auth/login succeed,
// cleared on logout, so any component can read the user with useSelector.
import { createSlice } from '@reduxjs/toolkit';
import { api } from './api';

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, demoClock: false },
  reducers: {
    loggedOut: (state) => {
      state.user = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(api.endpoints.me.matchFulfilled, (state, { payload }) => {
      state.user = payload.user;
      state.demoClock = payload.demoClock;
    });
    builder.addMatcher(api.endpoints.login.matchFulfilled, (state, { payload }) => {
      state.user = payload.user;
    });
  },
});

export const { loggedOut } = authSlice.actions;
export const selectUser = (s) => s.auth.user;
export const selectDemoClock = (s) => s.auth.demoClock;
export default authSlice.reducer;
