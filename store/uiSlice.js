// Small UI state shared across pages: toast notifications.
import { createSlice } from '@reduxjs/toolkit';

let nextId = 1;

const uiSlice = createSlice({
  name: 'ui',
  initialState: { toasts: [] },
  reducers: {
    toastAdded: {
      reducer(state, { payload }) {
        state.toasts.push(payload);
      },
      prepare: (message, tone = 'ok') => ({ payload: { id: nextId++, message, tone } }),
    },
    toastRemoved(state, { payload }) {
      state.toasts = state.toasts.filter((t) => t.id !== payload);
    },
  },
});

export const { toastAdded, toastRemoved } = uiSlice.actions;
export default uiSlice.reducer;
