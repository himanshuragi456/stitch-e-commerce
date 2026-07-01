import { api } from './client';
import type { Customer, Order, PaginatedResponse } from './types';

export const customersApi = {
  list: (params?: { search?: string; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<Customer>>('/admin/customers', params as Record<string, string | number | boolean | undefined | null>),

  get: (id: string) =>
    api.get<{ data: Customer; recent_orders: Order[] }>(`/admin/customers/${id}`),
};
