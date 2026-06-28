import { apiClient } from './api-client';

export interface PortalOrder {
  id: string;
  code: string;
  status: string;
  total: string;
  createdAt: string;
}

export interface PortalTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  createdAt: string;
}

export interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  total: string;
  status: string;
  createdAt: string;
}

export interface OrderTracking {
  orderCode: string;
  status: string;
  steps: Array<{ step: string; completed: boolean; date?: string }>;
}

export const portalApi = {
  getOrders: () => apiClient.get<PortalOrder[]>('/portal/orders'),
  getOrderTracking: (id: string) => apiClient.get<OrderTracking>(`/portal/orders/${id}/track`),
  getTickets: () => apiClient.get<PortalTicket[]>('/portal/tickets'),
  createTicket: (data: { subject: string; message: string }) =>
    apiClient.post<PortalTicket>('/portal/tickets', data),
  getInvoices: () => apiClient.get<PortalInvoice[]>('/portal/invoices'),
};
