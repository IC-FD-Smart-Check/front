import CryptoJS from 'crypto-js';

export const crypto = {
  /**
   * Gera ID do dispositivo via fingerprinting de características do browser.
   * Mais difícil de copiar do que um UUID persistido no localStorage.
   * Usa localStorage como fallback se o fingerprinting falhar.
   */
  getDeviceId: (): string => {
    // Try to generate a stable fingerprint from browser characteristics
    // Falls back to localStorage UUID if fingerprinting fails
    try {
      const components = [
        navigator.userAgent,
        navigator.language,
        `${screen.width}x${screen.height}x${screen.colorDepth}`,
        String(new Date().getTimezoneOffset()),
        String(navigator.hardwareConcurrency ?? ''),
      ];

      // Canvas fingerprint (differs per GPU/driver/browser)
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = '14px Arial';
          ctx.fillText('FDSmartCheck🔒', 2, 2);
          components.push(canvas.toDataURL().slice(-50));
        }
      } catch {
        // Canvas blocked — skip
      }

      const raw = components.join('|');
      // Simple hash (djb2) — no crypto dependency needed
      let hash = 5381;
      for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) + hash) ^ raw.charCodeAt(i);
        hash = hash >>> 0; // keep unsigned 32-bit
      }

      return hash.toString(16).padStart(8, '0');
    } catch {
      // Fallback: persistent UUID in localStorage
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = CryptoJS.lib.WordArray.random(16).toString();
        localStorage.setItem('deviceId', deviceId);
      }
      return deviceId;
    }
  },
};
