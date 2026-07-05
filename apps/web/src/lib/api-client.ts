import axios from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3456";

// In the browser we route API calls through the Next.js web origin. This keeps
// cookies/auth headers on the same origin and avoids cross-origin/CORS issues
// when the web app is served from a different host/port than the API (e.g.
// Docker self-contained image, reverse proxy, staging). The rewrite in
// next.config.mjs proxies /api-gateway/:path* to the real API server.
// During SSR we still use the absolute API_BASE_URL because relative URLs have
// no origin in Node.js.
export const API_BROWSER_BASE_URL =
  typeof window === 'undefined' ? API_BASE_URL : '/api-gateway';

export const apiClient = axios.create({
  baseURL: API_BROWSER_BASE_URL,
  headers: { "Content-Type": "application/json", "X-API-Version": "1" },
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  if (typeof localStorage !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap standard API response: { success, data } → data
// Also handles legacy NestJS wrapper: { value: [...], Count: N } → [...]
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      if ('success' in response.data && 'data' in response.data) {
        response.data = response.data.data;
      } else if ('value' in response.data && Array.isArray(response.data.value)) {
        response.data = response.data.value;
      }
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
      return Promise.reject(error);
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

