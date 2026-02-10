import api from './api';
import { EventRequest, EventResponse } from '@/types';

export const eventService = {
  // Buscar todos os eventos
  getAllEvents: async (): Promise<EventResponse[]> => {
    const response = await api.get('/events');
    return response.data;
  },

  // Buscar evento por ID
  getEventById: async (id: string): Promise<EventResponse> => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  // Criar novo evento
  createEvent: async (data: EventRequest): Promise<EventResponse> => {
    const response = await api.post('/events', data);
    return response.data;
  },

  // Atualizar evento
  updateEvent: async (id: string, data: EventRequest): Promise<EventResponse> => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
  },

  // Deletar evento
  deleteEvent: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}`);
  },

  getUpcoming: async (): Promise<EventResponse[]> => {
    const response = await api.get<EventResponse[]>('/events/upcoming');
    return response.data;
  },
};
