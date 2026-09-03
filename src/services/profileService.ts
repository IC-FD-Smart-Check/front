import api from './api';
import type { UserResponse } from '@/types';

export const profileService = {
  // GET - Dados do usuário autenticado
  getProfile: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>('/me');
    return response.data;
  },

  // PATCH - O próprio usuário troca sua senha
  updatePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.patch('/me/password', { currentPassword, newPassword });
  },

  // PATCH - O próprio usuário cadastra ou troca seu email
  updateEmail: async (email: string): Promise<UserResponse> => {
    const response = await api.patch<UserResponse>('/me/email', { email });
    return response.data;
  },
};
