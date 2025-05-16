'use client';

import { Toaster } from 'react-hot-toast';

export const toastConfig = {
  position: 'bottom-right' as const,
  duration: 4000,
  style: {
    background: 'var(--background)',
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
  },
  className: 'bg-background text-foreground border border-border',
  success: {
    iconTheme: {
      primary: 'var(--success)',
      secondary: 'var(--background)',
    },
  },
  error: {
    iconTheme: {
      primary: 'var(--destructive)',
      secondary: 'var(--background)',
    },
  },
};

export function ToastProvider() {
  return <Toaster toastOptions={toastConfig} />;
} 