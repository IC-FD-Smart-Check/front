import api from './api';
import type { UserResponse } from '@/types';

export const profileService = {
  // GET - Dados do usuário autenticado
  getProfile: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>('/me');
    return response.data;
  },

  // PATCH - O próprio usuário troca sua senha.
  // A troca derruba os tokens antigos — inclusive o atual. O backend devolve um
  // novo, que substitui o guardado para o usuário não ser deslogado.
  updatePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const response = await api.patch<{ token: string }>('/me/password', { currentPassword, newPassword });
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
    }
  },

  // PATCH - O próprio usuário cadastra ou troca seu email
  updateEmail: async (email: string): Promise<UserResponse> => {
    const response = await api.patch<UserResponse>('/me/email', { email });
    return response.data;
  },
};
