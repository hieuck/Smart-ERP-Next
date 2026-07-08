import { useState, useCallback, useEffect, useRef } from 'react';

export type NotificationVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastNotification {
  id: string;
  message: string;
  variant: NotificationVariant;
  duration?: number;
}

/**
 * Simple in-memory toast notification queue.
 * Pair with a Toast UI component to render.
 */
export function useNotifications() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  const push = useCallback(
    (message: string, variant: NotificationVariant = 'info', duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, variant, duration }]);

      if (duration > 0) {
        const timeoutId = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
        timeoutsRef.current.push(timeoutId);
      }

      return id;
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg: string) => push(msg, 'success'), [push]);
  const error = useCallback((msg: string) => push(msg, 'error'), [push]);
  const warning = useCallback((msg: string) => push(msg, 'warning'), [push]);
  const info = useCallback((msg: string) => push(msg, 'info'), [push]);

  return { toasts, push, dismiss, success, error, warning, info };
}
