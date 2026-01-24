import api from './api';
import { SubEventRequest, SubEventResponse } from '@/types';

export const subEventService = {
  // Buscar todos os subeventos de um evento
  getSubEventsByEventId: async (eventId: string): Promise<SubEventResponse[]> => {
    const response = await api.get(`/subevents/event/${eventId}`);
    return response.data;
  },

  // Buscar subevento por ID
  getSubEventById: async (eventId: string, subEventId: string): Promise<SubEventResponse> => {
    const response = await api.get(`/subevents/${subEventId}`);
    return response.data;
  },

  // Criar novo subevento
  createSubEvent: async (eventId: string, data: SubEventRequest): Promise<SubEventResponse> => {
    const response = await api.post('/subevents', data);
    return response.data;
  },

  // Atualizar subevento
  updateSubEvent: async (eventId: string, subEventId: string, data: SubEventRequest): Promise<SubEventResponse> => {
    const response = await api.put(`/subevents/${subEventId}`, data);
    return response.data;
  },

  // Deletar subevento
  deleteSubEvent: async (eventId: string, subEventId: string): Promise<void> => {
    await api.delete(`/subevents/${subEventId}`);
  },
};
