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

export interface CreateOrderItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  discountPercent?: number;
  taxRate?: number;
  notes?: string;
  batchNumber?: string;
}

export interface CreateOrderPayload {
  customerId?: string;
  warehouseId?: string;
  channel?: 'pos' | 'online' | 'phone' | 'wholesale';
  discountAmount?: number;
  discountPercent?: number;
  shippingFee?: number;
  paymentMethod?: 'cash' | 'bank_transfer' | 'card' | 'momo' | 'vnpay' | 'zalopay' | 'credit';
  shippingAddress?: string;
  notes?: string;
  items: CreateOrderItemPayload[];
}

export const ordersApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    paymentStatus?: string;
    channel?: string;
  }): Promise<OrderListResponse> => {
    const res = await apiClient.get<OrderListResponse>('/orders', { params });
    return res.data;
  },

  getOne: async (id: string): Promise<Order> => {
    const res = await apiClient.get<Order>(`/orders/${id}`);
    return res.data;
  },

  create: async (data: CreateOrderPayload): Promise<Order> => {
    const res = await apiClient.post<Order>('/orders', data);
    return res.data;
  },

  updateStatus: async (id: string, status: string, cancelReason?: string): Promise<Order> => {
    const res = await apiClient.patch<Order>(`/orders/${id}/status`, { status, cancelReason });
    return res.data;
  },
};
