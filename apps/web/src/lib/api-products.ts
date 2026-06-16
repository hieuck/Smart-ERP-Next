import { API_BASE_URL, apiClient } from './api-client';

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  category: string | null;
  unit: string | null;
  /** Stored as numeric string from DB */
  price: string;
  cost: string | null;
  stock: number;
  minStock: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
}

export interface ProductImageUploadResponse {
  imageUrl: string;
  filename: string;
  size: number;
  mimeType: string;
}

export function resolveProductImageUrl(imageUrl?: string | null): string {
  if (!imageUrl) return '';
  if (/^(https?:|data:|blob:)/i.test(imageUrl)) return imageUrl;
  if (imageUrl.startsWith('/')) return `${API_BASE_URL}${imageUrl}`;
  return imageUrl;
}

export const productsApi = {
  /** Returns `{ items, total, page, limit, totalPages }` directly */
  getAll: async (params?: ProductQueryParams): Promise<ProductsResponse> => {
    const res = await apiClient.get<ProductsResponse>('/products', { params });
    return res.data;
  },

  getById: async (id: string): Promise<Product> => {
    const res = await apiClient.get<Product>(`/products/${id}`);
    return res.data;
  },

  getBySku: async (sku: string): Promise<Product> => {
    const res = await apiClient.get<Product>(`/products/sku/${sku}`);
    return res.data;
  },

  create: async (data: Record<string, any>): Promise<Product> => {
    const res = await apiClient.post<Product>('/products', data);
    return res.data;
  },

  uploadImage: async (file: File): Promise<ProductImageUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ProductImageUploadResponse>('/products/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { ...res.data, imageUrl: resolveProductImageUrl(res.data.imageUrl) };
  },

  update: async (id: string, data: Partial<Product> | Record<string, any>): Promise<Product> => {
    const res = await apiClient.patch<Product>(`/products/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  adjustStock: async (
    id: string,
    quantity: number,
    type: 'IN' | 'OUT' | 'ADJUSTMENT' = 'ADJUSTMENT',
    notes?: string
  ): Promise<Product> => {
    const res = await apiClient.patch<Product>(`/products/${id}/stock`, { quantity, type, notes });
    return res.data;
  },

  getTransactions: async (id: string) => {
    const res = await apiClient.get(`/products/${id}/transactions`);
    return res.data;
  },
};

