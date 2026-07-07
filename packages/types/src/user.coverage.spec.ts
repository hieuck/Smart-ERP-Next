import type { User } from './user';

describe('User type', () => {
  it('matches the database schema fields including role, isActive, passwordHash, phone, avatar, and preferences', () => {
    const user: User = {
      id: 'user-1',
      email: 'user@example.com',
      name: null,
      avatar: null,
      phone: null,
      preferences: null,
      passwordHash: null,
      role: 'user',
      isActive: true,
      tenantId: 'tenant-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(user.role).toBe('user');
    expect(user.isActive).toBe(true);
    expect(user.passwordHash).toBeNull();
    expect(user.phone).toBeNull();
    expect(user.avatar).toBeNull();
    expect(user.preferences).toBeNull();
  });
});
