import { api } from './client';
import type { Order, PaginatedResponse } from './types';

export interface OrderFilters {
  status?: string;
  payment_status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export const ordersApi = {
  list: (filters?: OrderFilters) =>
    api.get<PaginatedResponse<Order>>('/admin/orders', filters as Record<string, string | number | boolean | undefined | null>),

  get: (id: string) => api.get<{ data: Order }>(`/admin/orders/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch<{ data: Order }>(`/admin/orders/${id}/status`, { status }),

  updateNotes: (id: string, notes: string | null) =>
    api.patch<{ data: Order }>(`/admin/orders/${id}/notes`, { notes }),

  refund: (id: string) => api.post<{ data: Order }>(`/admin/orders/${id}/refund`),

  labelUrl: (id: string) => `${import.meta.env.VITE_API_URL}/admin/orders/${id}/label`,

  batchLabels: (order_ids: string[]) =>
    api.post<Blob>('/admin/orders/labels/batch', { order_ids }),
};
