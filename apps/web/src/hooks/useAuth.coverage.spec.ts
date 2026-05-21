import { useAuth } from './useAuth';

describe('useAuth stub hook', () => {
  it('returns the default unauthenticated auth context', async () => {
    const auth = useAuth();

    expect(auth.user).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.isLoading).toBe(false);
    expect(auth.token).toBeNull();
    await expect(auth.login('demo@example.com', 'password')).resolves.toBeUndefined();
    await expect(auth.logout()).resolves.toBeUndefined();
  });
});
