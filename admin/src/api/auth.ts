import { api } from './client';
import type { Staff } from './types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; staff: Staff }>('/admin/auth/login', { email, password }),

  logout: () => api.post<void>('/admin/auth/logout'),

  me: () => api.get<{ data: Staff }>('/admin/auth/me'),
};
