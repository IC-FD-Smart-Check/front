import api from './api';
import type { AllowedNetwork, AllowedNetworkRequest } from '@/types';

/**
 * Configurações do sistema. Hoje somente as redes autorizadas a fazer
 * check-in — os quatro links dedicados da instituição.
 */
export const settingsService = {
  listAllowedNetworks: async (): Promise<AllowedNetwork[]> => {
    const response = await api.get<AllowedNetwork[]>('/settings/allowed-networks');
    return response.data;
  },

  /** IP de onde o próprio admin está acessando, para cadastrar sem adivinhar. */
  currentIp: async (): Promise<string> => {
    const response = await api.get<{ ip: string }>('/settings/current-ip');
    return response.data.ip;
  },

  createAllowedNetwork: async (data: AllowedNetworkRequest): Promise<AllowedNetwork> => {
    const response = await api.post<AllowedNetwork>('/settings/allowed-networks', data);
    return response.data;
  },

  setAllowedNetworkActive: async (id: string, active: boolean): Promise<AllowedNetwork> => {
    const response = await api.patch<AllowedNetwork>(`/settings/allowed-networks/${id}`, { active });
    return response.data;
  },

  deleteAllowedNetwork: async (id: string): Promise<void> => {
    await api.delete(`/settings/allowed-networks/${id}`);
  },
};
