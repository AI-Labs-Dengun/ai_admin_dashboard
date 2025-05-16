'use client';

import { Toaster } from 'react-hot-toast';

export const toastConfig = {
  position: 'bottom-right' as const,
  duration: 4000,
  style: {
    background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0.5rem',
    padding: '1rem',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  className: 'bg-background text-foreground border border-border',
  success: {
    iconTheme: {
      primary: 'hsl(var(--success))',
      secondary: 'hsl(var(--background))',
    },
    style: {
      background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
      border: '1px solid hsl(var(--success))',
    },
  },
  error: {
    iconTheme: {
      primary: 'hsl(var(--destructive))',
      secondary: 'hsl(var(--background))',
    },
    style: {
      background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
      border: '1px solid hsl(var(--destructive))',
    },
  },
  loading: {
    iconTheme: {
      primary: 'hsl(var(--primary))',
      secondary: 'hsl(var(--background))',
    },
    style: {
      background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
      border: '1px solid hsl(var(--primary))',
    },
  },
};

export function ToastProvider() {
  return <Toaster toastOptions={toastConfig} />;
} 