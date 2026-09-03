import api from './api';
import type { DashboardStatsResponse } from '@/types';

export const dashboardService = {
  // GET - Métricas agregadas da tela inicial (ADMIN)
  getStats: async (): Promise<DashboardStatsResponse> => {
    const response = await api.get<DashboardStatsResponse>('/dashboard/stats');
    return response.data;
  },
};
