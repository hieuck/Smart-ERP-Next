// CRM API Client - shared across Web, Mobile, Desktop
import { apiClient } from './api-client';

export interface Lead {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  status: string;
  leadScore: number;
  industry?: string;
  description?: string;
  assignedToId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadStats {
  total: number;
  byStatus: { status: string; count: number }[];
  winRate: number;
}

export interface NextBestAction {
  action: 'call' | 'email' | 'meeting' | 'proposal' | 'follow_up';
  priority: number;
  reason: string;
}

export interface CreateLeadInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status?: string;
  leadScore?: number;
  industry?: string;
  description?: string;
  assignedToId?: string;
}

export type UpdateLeadInput = Partial<CreateLeadInput>;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const leadsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string; source?: string }) =>
    apiClient.get<PaginatedResponse<Lead>>('/crm/leads', { params }),

  getOne: (id: string) =>
    apiClient.get<Lead>(`/crm/leads/${id}`),

  create: (data: CreateLeadInput) =>
    apiClient.post<Lead>('/crm/leads', data),

  update: (id: string, data: UpdateLeadInput) =>
    apiClient.patch<Lead>(`/crm/leads/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/crm/leads/${id}`),

  getStats: () =>
    apiClient.get<LeadStats>('/crm/leads/stats'),

  getNextBestAction: (leadId: string) =>
    apiClient.get<NextBestAction>(`/crm/next-best-action/lead/${leadId}`),

  convertToCustomer: (leadId: string, customerData?: Partial<CreateLeadInput>) =>
    apiClient.post<Lead>(`/crm/leads/${leadId}/convert`, { customerData }),
};

