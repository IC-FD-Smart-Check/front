import api from './api';
import type { ClassGroupRequest, ClassGroupResponse } from '@/types';

export const classGroupService = {
  // GET - Lista todas as turmas
  getAllClassGroups: async (): Promise<ClassGroupResponse[]> => {
    const response = await api.get<ClassGroupResponse[]>('/class-groups');
    return response.data;
  },

  // GET - Lista turmas de um curso
  getClassGroupsByCourse: async (courseId: string): Promise<ClassGroupResponse[]> => {
    const response = await api.get<ClassGroupResponse[]>(`/class-groups/course/${courseId}`);
    return response.data;
  },

  // GET - Busca turma por ID
  getClassGroupById: async (id: string): Promise<ClassGroupResponse> => {
    const response = await api.get<ClassGroupResponse>(`/class-groups/${id}`);
    return response.data;
  },

  // POST - Cria nova turma
  createClassGroup: async (request: ClassGroupRequest): Promise<ClassGroupResponse> => {
    const response = await api.post<ClassGroupResponse>('/class-groups', request);
    return response.data;
  },

  // PUT - Atualiza turma
  updateClassGroup: async (id: string, request: ClassGroupRequest): Promise<ClassGroupResponse> => {
    const response = await api.put<ClassGroupResponse>(`/class-groups/${id}`, request);
    return response.data;
  },

  // DELETE - Deleta turma
  deleteClassGroup: async (id: string): Promise<void> => {
    await api.delete(`/class-groups/${id}`);
  },
};
