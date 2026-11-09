// The Redux store: three slices of our own plus the RTK Query cache.
import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import auth from './authSlice';
import planner from './plannerSlice';
import ui from './uiSlice';

export function makeStore() {
  return configureStore({
    reducer: { auth, planner, ui, [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
}
