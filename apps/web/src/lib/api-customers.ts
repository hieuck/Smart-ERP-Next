// @ts-nocheck
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
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    group?: string;
    isActive?: boolean;
  }): Promise<{ data: CustomerListResponse }> =>
    apiClient.get('/customers', { params }),

  getOne: (id: string): Promise<{ data: Customer }> =>
    apiClient.get(`/customers/${id}`),

  create: (data: Partial<Customer>): Promise<{ data: Customer }> =>
    apiClient.post('/customers', data),

  update: (id: string, data: Partial<Customer>): Promise<{ data: Customer }> =>
    apiClient.patch(`/customers/${id}`, data),

  delete: (id: string): Promise<{ data: Customer }> =>
    apiClient.delete(`/customers/${id}`),
};
