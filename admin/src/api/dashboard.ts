import { api } from './client';
import type { DashboardData } from './types';

export const dashboardApi = {
  get: () => api.get<DashboardData>('/admin/dashboard'),
};
