import api from './api';
import type { ImportTemplateResponse, StudentImportResponse } from '@/types';

/**
 * A instância `api` define Content-Type: application/json por padrão, e o axios
 * converte FormData em JSON quando esse header está presente. Declarar
 * multipart/form-data aqui evita isso — o browser depois substitui o valor
 * pelo header com o boundary correto.
 */
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

const buildFormData = (templateId: string, file: File): FormData => {
  const formData = new FormData();
  formData.append('templateId', templateId);
  formData.append('file', file);
  return formData;
};

export const importService = {
  // GET - Templates de importação disponíveis
  getTemplates: async (): Promise<ImportTemplateResponse[]> => {
    const response = await api.get<ImportTemplateResponse[]>('/imports/students/templates');
    return response.data;
  },

  // POST - Lê o arquivo e devolve o que seria importado, sem gravar
  preview: async (templateId: string, file: File): Promise<StudentImportResponse> => {
    const response = await api.post<StudentImportResponse>(
      '/imports/students/preview',
      buildFormData(templateId, file),
      MULTIPART
    );
    return response.data;
  },

  // POST - Efetiva a importação
  execute: async (templateId: string, file: File): Promise<StudentImportResponse> => {
    const response = await api.post<StudentImportResponse>(
      '/imports/students/execute',
      buildFormData(templateId, file),
      MULTIPART
    );
    return response.data;
  },
};
