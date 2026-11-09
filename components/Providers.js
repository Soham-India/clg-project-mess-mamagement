'use client';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from '@/store';
import { Toasts } from './ui';

export default function Providers({ children }) {
  const [store] = useState(makeStore);
  return (
    <Provider store={store}>
      {children}
      <Toasts />
    </Provider>
  );
}
