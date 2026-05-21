// @ts-nocheck
import { apiClient } from './api-client';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productSku: string;
  unit: string | null;
  quantity: number;
  unitPrice: string;
  discountAmount: string | null;
  lineTotal: string;
  notes: string | null;
}

export interface Order {
  id: string;
  tenantId: string;
  code: string;
  customerId: string | null;
  warehouseId: string | null;
  status: string;
  channel: string;
  subtotal: string;
  discountAmount: string | null;
  taxAmount: string | null;
  shippingFee: string | null;
  total: string;
  paidAmount: string | null;
  debtAmount: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  notes: string | null;
  cancelReason: string | null;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const ordersApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    paymentStatus?: string;
    channel?: string;
  }): Promise<{ data: OrderListResponse }> =>
    apiClient.get('/orders', { params }),

  getOne: (id: string): Promise<{ data: Order }> =>
    apiClient.get(`/orders/${id}`),

  create: (data: any): Promise<{ data: Order }> =>
    apiClient.post('/orders', data),

  updateStatus: (id: string, status: string, cancelReason?: string): Promise<{ data: Order }> =>
    apiClient.patch(`/orders/${id}/status`, { status, cancelReason }),
};
