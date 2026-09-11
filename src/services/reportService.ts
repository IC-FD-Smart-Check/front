import api from './api';
import type { AxiosResponse } from 'axios';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  format: 'PDF' | 'EXCEL';
}

export const reportService = {
  exportEventPdf: async (eventId: string): Promise<AxiosResponse<Blob>> => {
    return api.get(`/reports/event/${eventId}/pdf`, {
      responseType: 'blob',
    });
  },

  exportSubEventPdf: async (subEventId: string): Promise<AxiosResponse<Blob>> => {
    return api.get(`/reports/subevent/${subEventId}/pdf`, {
      responseType: 'blob',
    });
  },

  exportEventExcel: async (eventId: string): Promise<AxiosResponse<Blob>> => {
    return api.get(`/reports/event/${eventId}/excel`, {
      responseType: 'blob',
    });
  },

  exportSubEventExcel: async (subEventId: string): Promise<AxiosResponse<Blob>> => {
    return api.get(`/reports/subevent/${subEventId}/excel`, {
      responseType: 'blob',
    });
  },

  /**
   * Modelos disponíveis. A lista vem do backend, não é fixa aqui: um modelo
   * novo registrado lá aparece nesta tela sem mexer no front.
   */
  listTemplates: async (): Promise<ReportTemplate[]> => {
    const response = await api.get<ReportTemplate[]>('/reports/templates');
    return response.data;
  },

  exportSubEventByTemplate: async (
    subEventId: string,
    templateId: string,
  ): Promise<AxiosResponse<Blob>> => {
    return api.get(`/reports/subevent/${subEventId}/export/${templateId}`, {
      responseType: 'blob',
    });
  },
};
