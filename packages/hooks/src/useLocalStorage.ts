import { useState, useCallback, useEffect } from 'react';

export interface UseLocalStorageOptions<T> {
  /** Optional validator that receives the parsed value and returns true if it matches the expected shape. */
  validator?: (value: unknown) => value is T;
}

function getNamespacedKey(key: string): string {
  return `smart-erp:${key}`;
}

/**
 * Persist state to localStorage with JSON serialization and optional validation.
 */
export function useLocalStorage<T>(key: string, initialValue: T, options?: UseLocalStorageOptions<T>) {
  const namespacedKey = getNamespacedKey(key);
  const validator = options?.validator;

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(namespacedKey);
      if (!item) return initialValue;
      const parsed = JSON.parse(item) as unknown;
      if (validator && !validator(parsed)) {
        return initialValue;
      }
      return parsed as T;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return undefined;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== namespacedKey || event.storageArea !== window.localStorage) {
        return;
      }
      try {
        const next = event.newValue ? (JSON.parse(event.newValue) as unknown) : initialValue;
        if (validator && !validator(next)) {
          return;
        }
        setStoredValue(next as T);
      } catch {
        // Ignore malformed storage events.
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [namespacedKey, initialValue]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(namespacedKey, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`useLocalStorage: failed to set "${namespacedKey}"`, error);
      }
    },
    [namespacedKey, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(namespacedKey);
      }
    } catch (error) {
      console.error(`useLocalStorage: failed to remove "${namespacedKey}"`, error);
    }
  }, [namespacedKey, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}
