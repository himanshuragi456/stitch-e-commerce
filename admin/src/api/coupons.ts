import { api } from './client';
import type { Coupon } from './types';

export type CouponInput = {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_order_paise?: number | null;
  usage_limit?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
};

export const couponsApi = {
  list: () => api.get<{ data: Coupon[] }>('/admin/coupons'),
  get: (id: string) => api.get<{ data: Coupon }>(`/admin/coupons/${id}`),
  create: (data: CouponInput) => api.post<{ data: Coupon }>('/admin/coupons', data),
  update: (id: string, data: Partial<CouponInput>) =>
    api.patch<{ data: Coupon }>(`/admin/coupons/${id}`, data),
  delete: (id: string) => api.delete(`/admin/coupons/${id}`),
};
