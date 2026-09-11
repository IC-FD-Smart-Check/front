import api from './api';
import { geoSecurity, GeolocationError } from '@/utils/geoSecurity';
import type {
  CheckInfoResponse,
  CheckRequest,
  CheckResponse,
} from '@/types';

export const checkService = {
  /**
   * Valida QR Code e retorna informações do evento
   */
  getCheckInfo: async (qrCode: string): Promise<CheckInfoResponse> => {
    const response = await api.get<CheckInfoResponse>('/checkin/info', {
      params: { qrCode },
    });
    return response.data;
  },

  /**
   * Realiza check-in ou checkout com geolocalização segura
   */
  performCheck: async (
    qrCode: string,
    type: 'CHECKIN' | 'CHECKOUT',
    photoBase64?: string,
  ): Promise<CheckResponse> => {
    try {
      // 1. Capturar geolocalização segura
      const { geoPayload, signature } = await geoSecurity.createSecureRequest();

      // 2. Criar requisição
      const request: CheckRequest = {
        requestId: crypto.randomUUID(),
        qrCode,
        type,
        geoPayload,
        signature,
        // Obrigatória nos dois fluxos.
        photoBase64,
      };

      // 3. Enviar ao backend
      const response = await api.post<CheckResponse>('/checkin', request);
      return response.data;
    } catch (error) {
      if (error instanceof GeolocationError) {
        throw new Error(error.message);
      }
      throw error;
    }
  },

  /**
   * Baixa a foto de um check-in (ADMIN) e devolve uma object URL.
   *
   * Não dá para apontar um <img src> direto para o endpoint: ele exige o
   * cabeçalho Authorization, que o navegador não manda em carregamento de
   * imagem. Por isso o blob passa pelo axios e vira URL local.
   * Quem chama é responsável por revogar a URL (URL.revokeObjectURL).
   */
  getPhotoUrl: async (checkId: string, type: 'CHECKIN' | 'CHECKOUT'): Promise<string> => {
    const response = await api.get(`/checkin/${checkId}/photo/${type}`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  },

  /**
   * Busca histórico de checks do usuário autenticado
   */
  getHistory: async (): Promise<CheckResponse[]> => {
    const response = await api.get<CheckResponse[]>('/checkin/history');
    return response.data;
  },

  /**
   * Busca checks de um evento específico (ADMIN)
   */
  getEventChecks: async (eventId: string): Promise<CheckResponse[]> => {
    const response = await api.get<CheckResponse[]>(`/checkin/event/${eventId}`);
    return response.data;
  },

  /**
   * Verifica suporte e permissão de geolocalização
   */
  checkGeolocation: async (): Promise<{
    supported: boolean;
    permission: PermissionState | null;
  }> => {
    const supported = geoSecurity.isSupported();
    
    if (!supported) {
      return { supported: false, permission: null };
    }

    try {
      const permission = await geoSecurity.requestPermission();
      return { supported: true, permission };
    } catch {
      return { supported: true, permission: null };
    }
  },
};