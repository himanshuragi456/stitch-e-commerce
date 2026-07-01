import { api } from './client';

export const settingsApi = {
  list: () => api.get<{ data: Record<string, unknown> }>('/admin/settings'),

  update: (settings: Record<string, unknown>) =>
    api.patch<{ message: string }>('/admin/settings', { settings }),

  rebuildStorefront: () =>
    api.post<{ triggered: boolean; message: string }>('/admin/rebuild-storefront'),
};
