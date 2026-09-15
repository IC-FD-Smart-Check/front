import api from './api';
import type { TermsDocument, UserResponse } from '@/types';

/**
 * Termos de uso. O texto vem do backend, que também é dono da versão: assim
 * não existe a situação de o sistema exigir aceite de um texto que o front
 * ainda não publicou.
 */
export const termsService = {
  current: async (): Promise<TermsDocument> => {
    const response = await api.get<TermsDocument>('/terms');
    return response.data;
  },

  accept: async (version: string): Promise<UserResponse> => {
    const response = await api.post<UserResponse>('/me/terms', { version });
    return response.data;
  },
};
