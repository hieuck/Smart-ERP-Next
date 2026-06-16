import axios from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3456";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  if (typeof localStorage !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap NestJS serialization wrapper: { value: [...], Count: N } → [...]
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'value' in response.data && Array.isArray(response.data.value)) {
      response.data = response.data.value;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const hadToken = Boolean(localStorage.getItem("access_token"));
      if (!hadToken) return Promise.reject(error);

      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      document.cookie = "access_token=; Path=/; Max-Age=0; SameSite=Lax";
      if (!["/login", "/register"].includes(window.location.pathname)) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post("/auth/login", { email, password }),
  register: (data: {
    email: string;
    password: string;
    name?: string;
    companyName?: string;
    tenantId?: string;
  }) => apiClient.post("/auth/register", data),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: (search?: string) =>
    apiClient.get("/users", { params: search ? { search } : undefined }),
  getStats: () => apiClient.get("/users/stats"),
  getOne: (id: string) => apiClient.get(`/users/${id}`),
  create: (data: any) => apiClient.post("/users", data),
  update: (id: string, data: any) => apiClient.patch(`/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
};

