import { api } from './client';
import type { Category } from './types';

export const categoriesApi = {
  list: () => api.get<{ data: Category[] }>('/admin/categories'),

  create: (data: FormData) => api.upload<{ data: Category }>('/admin/categories', data),

  update: (id: string, data: FormData) =>
    api.upload<{ data: Category }>(`/admin/categories/${id}`, data, 'PATCH'),

  delete: (id: string) => api.delete(`/admin/categories/${id}`),
};
