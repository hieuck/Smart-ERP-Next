/**
 * @jest-environment jsdom
 */
import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { useAuth, AuthProvider } from '@/contexts/auth-context';

describe('useAuth hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(AuthProvider, null, children) as any;

  it('returns the default unauthenticated auth context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it('restores auth state from localStorage', () => {
    const user = { id: 'u1', email: 'a@b.com', name: 'Test', tenantId: 't1', role: 'admin' };
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('user', JSON.stringify(user));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(user);
    expect(result.current.token).toBe('test-token');
    expect(result.current.isAuthenticated).toBe(true);

    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  });
});
