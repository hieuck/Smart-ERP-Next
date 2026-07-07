import { apiClient } from './api-client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id: string): void {
  if (!UUID_REGEX.test(id)) {
    throw new Error(`Invalid UUID: ${id}`);
  }
}

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
  getOrders: async () => {
    try {
      return (await apiClient.get<PortalOrder[]>('/portal/orders')).data;
    } catch (error) {
      throw new Error(`Failed to fetch orders: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  getOrderTracking: async (id: string) => {
    validateUUID(id);
    try {
      return (await apiClient.get<OrderTracking>(`/portal/orders/${id}/track`)).data;
    } catch (error) {
      throw new Error(`Failed to fetch order tracking: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  getTickets: async () => {
    try {
      return (await apiClient.get<PortalTicket[]>('/portal/tickets')).data;
    } catch (error) {
      throw new Error(`Failed to fetch tickets: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  createTicket: async (data: { subject: string; message: string }) => {
    try {
      return (await apiClient.post<PortalTicket>('/portal/tickets', data)).data;
    } catch (error) {
      throw new Error(`Failed to create ticket: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  getInvoices: async () => {
    try {
      return (await apiClient.get<PortalInvoice[]>('/portal/invoices')).data;
    } catch (error) {
      throw new Error(`Failed to fetch invoices: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};
