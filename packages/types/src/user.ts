export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  phone: string | null;
  preferences: { theme?: 'light' | 'dark'; language?: string } | null;
  passwordHash: string | null;
  role: string;
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
