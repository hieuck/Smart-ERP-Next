'use client';

import React, { createContext, useContext } from 'react';
import { useNotifications, type NotificationVariant } from '@smart-erp/hooks';
import { ToastContainer } from '@smart-erp/shared';

interface ToastContextValue {
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, dismiss, success, error, warning, info } = useNotifications();

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
      <ToastContainer
        toasts={toasts.map((t) => ({ id: t.id, message: t.message, variant: t.variant }))}
        onDismiss={dismiss}
      />
    </ToastContext.Provider>
  );
}

/** Use this hook in any component to show toast notifications */
export function useToast() {
  return useContext(ToastContext);
}

