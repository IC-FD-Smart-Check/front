import api from './api';
import type { GeoPayload } from '@/utils/geoSecurity';

interface GeoSignResponse {
  latitude: number;
  longitude: number;
  timestamp: number;
  signature: string;
}

export const geoService = {
  signPayload: (payload: GeoPayload): Promise<GeoSignResponse> =>
    api.post<GeoSignResponse>('/geo/sign', payload).then(r => r.data),
};
