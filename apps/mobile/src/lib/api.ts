/**
 * Mobile API client — uses expo-secure-store for auth token.
 * Shared by all mobile screens.
 */
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type MobileHeaders = Record<string, string>;
type QueryParamValue = string | number | boolean | null | undefined;
type MobileRequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: MobileHeaders;
  params?: Record<string, QueryParamValue>;
};

async function getHeaders(): Promise<MobileHeaders> {
  const token = await SecureStore.getItemAsync('access_token');
  const tenantId = await SecureStore.getItemAsync('tenant_id');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
  };
}

function buildUrl(path: string, params?: Record<string, QueryParamValue>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  });

  const qs = query.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
}

async function request<T>(path: string, options: MobileRequestOptions = {}): Promise<T> {
  const headers = await getHeaders();
  const { params, ...requestOptions } = options;
  const res = await fetch(buildUrl(path, params), {
    ...requestOptions,
    headers: { ...headers, ...(requestOptions.headers ?? {}) },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T = any>(path: string, options?: MobileRequestOptions) => request<T>(path, options),
  post: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
