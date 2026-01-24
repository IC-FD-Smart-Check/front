import api from './api';
import { QRCodeResponse } from '@/types';

/**
 * Gerar novo QR Code para um SubEvent
 * Desativa automaticamente os QR Codes anteriores deste SubEvent
 * POST /api/qrcodes/generate/{subEventId}
 */
export const generateQRCode = async (subEventId: string): Promise<QRCodeResponse> => {
  const response = await api.post<QRCodeResponse>(`/qrcodes/generate/${subEventId}`);
  return response.data;
};

/**
 * Listar TODOS os QR Codes de um SubEvent (ativos e inativos)
 * GET /api/qrcodes/subevent/{subEventId}
 */
export const listQRCodesBySubEvent = async (subEventId: string): Promise<QRCodeResponse[]> => {
  const response = await api.get<QRCodeResponse[]>(`/qrcodes/subevent/${subEventId}`);
  return response.data;
};

/**
 * Buscar apenas o QR Code ATIVO de um SubEvent
 * GET /api/qrcodes/subevent/{subEventId}/active
 */
export const getActiveQRCode = async (subEventId: string): Promise<QRCodeResponse> => {
  const response = await api.get<QRCodeResponse>(`/qrcodes/subevent/${subEventId}/active`);
  return response.data;
};

/**
 * Validar um QR Code específico (retorna informações básicas)
 * GET /api/qrcodes/validate/{codeData}
 */
export const validateQRCode = async (codeData: string): Promise<QRCodeResponse> => {
  const response = await api.get<QRCodeResponse>(`/qrcodes/validate/${codeData}`);
  return response.data;
};

/**
 * Desativar um QR Code específico
 * PUT /api/qrcodes/{qrCodeId}/deactivate
 */
export const deactivateQRCode = async (qrCodeId: string): Promise<QRCodeResponse> => {
  const response = await api.put<QRCodeResponse>(`/qrcodes/${qrCodeId}/deactivate`);
  return response.data;
};

/**
 * Ativar um QR Code específico
 * Desativa automaticamente todos os outros QR Codes deste SubEvent
 * PUT /api/qrcodes/{qrCodeId}/activate
 */
export const activateQRCode = async (qrCodeId: string): Promise<QRCodeResponse> => {
  const response = await api.put<QRCodeResponse>(`/qrcodes/${qrCodeId}/activate`);
  return response.data;
};

export default {
  generateQRCode,
  listQRCodesBySubEvent,
  getActiveQRCode,
  validateQRCode,
  deactivateQRCode,
  activateQRCode,
};
