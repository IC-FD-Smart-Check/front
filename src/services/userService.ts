import api from './api';
import type { AdminPasswordResetResponse } from '@/types';
import { UserRequest, UserResponse } from '@/types';

export const userService = {
  // GET - Lista todos os usuários
  getAllUsers: async (): Promise<UserResponse[]> => {
    const response = await api.get<UserResponse[]>('/users');
    return response.data;
  },

  // GET - Busca usuário por ID
  getUserById: async (id: string): Promise<UserResponse> => {
    const response = await api.get<UserResponse>(`/users/${id}`);
    return response.data;
  },

  // POST - Cria novo usuário
  createUser: async (request: UserRequest): Promise<UserResponse> => {
    const response = await api.post<UserResponse>('/users', request);
    return response.data;
  },

  // PUT - Atualiza usuário
  updateUser: async (id: string, request: UserRequest): Promise<UserResponse> => {
    const response = await api.put<UserResponse>(`/users/${id}`, request);
    return response.data;
  },

  // DELETE - Deleta usuário
  /** Senha provisória (ADMIN). Vem uma vez só: o servidor guarda apenas o hash. */
  resetPassword: async (id: string): Promise<AdminPasswordResetResponse> => {
    const response = await api.post<AdminPasswordResetResponse>(`/users/${id}/reset-password`);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
