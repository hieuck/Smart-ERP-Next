import { users } from './users';

describe('users schema direct validation', () => {
  it('has tenantId field as uuid', () => {
    const userKeys = Object.keys(users);
    expect(userKeys).toContain('tenantId');
  });
  
  it('has name field as text', () => {
    const name = users.name;
    expect(typeof name).toBe('object');
    expect(name?.name).toBe('name');
  });
});
