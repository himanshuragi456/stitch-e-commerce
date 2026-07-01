import { api } from './client';
import type { Staff } from './types';

export const staffApi = {
  list: () => api.get<{ data: Staff[] }>('/admin/staff'),

  create: (data: { name: string; email: string; password: string; role: string; is_active?: boolean }) =>
    api.post<{ data: Staff }>('/admin/staff', data),

  update: (id: string, data: Partial<{ name: string; email: string; role: string; is_active: boolean }>) =>
    api.patch<{ data: Staff }>(`/admin/staff/${id}`, data),

  delete: (id: string) => api.delete(`/admin/staff/${id}`),

  resetPassword: (id: string, password: string) =>
    api.patch(`/admin/staff/${id}/password`, { password }),
};
