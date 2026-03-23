import api from './api';
import type { AxiosResponse } from 'axios';

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
};
