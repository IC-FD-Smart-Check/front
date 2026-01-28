import CryptoJS from 'crypto-js';

/**
 * Chave secreta compartilhada com o backend
 * ⚠️ IMPORTANTE: Esta deve ser a MESMA chave do application.properties
 * Em produção, deve vir de variável de ambiente
 */
const SECRET_KEY = import.meta.env.VITE_GEO_SECRET_KEY || 'CHANGE_THIS_IN_PRODUCTION_USE_STRONG_KEY';

export const crypto = {
  /**
   * Gera assinatura HMAC-SHA256
   */
  generateHMAC: (data: string): string => {
    return CryptoJS.HmacSHA256(data, SECRET_KEY).toString();
  },

  /**
   * Gera ID único do dispositivo (persiste no localStorage)
   */
  getDeviceId: (): string => {
    let deviceId = localStorage.getItem('deviceId');
    
    if (!deviceId) {
      deviceId = CryptoJS.lib.WordArray.random(16).toString();
      localStorage.setItem('deviceId', deviceId);
    }
    
    return deviceId;
  },
};