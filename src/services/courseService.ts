import api from './api';
import type { CourseRequest, CourseResponse } from '@/types';

export const courseService = {
  // GET - Lista todos os cursos
  getAllCourses: async (): Promise<CourseResponse[]> => {
    const response = await api.get<CourseResponse[]>('/courses');
    return response.data;
  },

  // GET - Busca curso por ID
  getCourseById: async (id: string): Promise<CourseResponse> => {
    const response = await api.get<CourseResponse>(`/courses/${id}`);
    return response.data;
  },

  // POST - Cria novo curso
  createCourse: async (request: CourseRequest): Promise<CourseResponse> => {
    const response = await api.post<CourseResponse>('/courses', request);
    return response.data;
  },

  // PUT - Atualiza curso
  updateCourse: async (id: string, request: CourseRequest): Promise<CourseResponse> => {
    const response = await api.put<CourseResponse>(`/courses/${id}`, request);
    return response.data;
  },

  // DELETE - Deleta curso
  deleteCourse: async (id: string): Promise<void> => {
    await api.delete(`/courses/${id}`);
  },
};
