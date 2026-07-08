import { apiClient } from './api-client';

export interface Customer {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  ward: string | null;
  district: string | null;
  province: string | null;
  taxCode: string | null;
  contactPerson: string | null;
  customerGroup: string | null;
  debtLimit: string | null;
  currentDebt: string | null;
  totalPurchased: string | null;
  loyaltyPoints: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const customersApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    group?: string;
    isActive?: boolean;
  }): Promise<CustomerListResponse> => {
    const res = await apiClient.get<CustomerListResponse>('/customers', { params });
    return res.data;
  },

  getOne: async (id: string): Promise<Customer> => {
    const res = await apiClient.get<Customer>(`/customers/${id}`);
    return res.data;
  },

  create: async (data: Partial<Customer>): Promise<Customer> => {
    const res = await apiClient.post<Customer>('/customers', data);
    return res.data;
  },

  update: async (id: string, data: Partial<Customer>): Promise<Customer> => {
    const res = await apiClient.patch<Customer>(`/customers/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },
};
