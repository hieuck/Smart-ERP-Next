export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const stubAuth: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  token: null,
  login: async () => {},
  logout: async () => {},
};

export function useAuth(): AuthContextValue {
  return stubAuth;
}

