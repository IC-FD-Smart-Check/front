import { crypto } from './crypto';
import { geoService } from '@/services/geoService';

export interface GeoPayload {
  latitude: number;
  longitude: number;
  timestamp: number;
  deviceId: string;
}

export interface SecureGeoRequest {
  geoPayload: GeoPayload;
  signature: string;
}

export class GeolocationError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = 'GeolocationError';
  }
}

export const geoSecurity = {
  /**
   * Captura geolocalização do dispositivo de forma segura
   * Usa GPS de alta precisão e sem cache
   */
  getCurrentPosition: (): Promise<GeoPayload> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new GeolocationError('Geolocalização não é suportada pelo seu navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const payload: GeoPayload = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: Date.now(),
            deviceId: crypto.getDeviceId(),
          };
          resolve(payload);
        },
        (error) => {
          let message = 'Erro ao obter localização';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Permissão de localização negada. Por favor, habilite a localização nas configurações do navegador.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Localização indisponível. Verifique se o GPS está ativado.';
              break;
            case error.TIMEOUT:
              message = 'Tempo esgotado ao tentar obter localização. Tente novamente.';
              break;
          }
          
          reject(new GeolocationError(message, error.code));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  },

  /**
   * Cria objeto completo e assinado para enviar ao backend
   */
  createSecureRequest: async (): Promise<SecureGeoRequest> => {
    const payload = await geoSecurity.getCurrentPosition();
    const { signature } = await geoService.signPayload(payload);
    return { geoPayload: payload, signature };
  },

  /**
   * Verifica se o navegador suporta geolocalização
   */
  isSupported: (): boolean => {
    return 'geolocation' in navigator;
  },

  /**
   * Solicita permissão de geolocalização (útil para verificar antes)
   */
  requestPermission: async (): Promise<PermissionState> => {
    if (!('permissions' in navigator)) {
      throw new Error('API de Permissões não suportada');
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch (error) {
      // Fallback: tentar obter localização diretamente
      try {
        await geoSecurity.getCurrentPosition();
        return 'granted';
      } catch {
        return 'denied';
      }
    }
  },
};