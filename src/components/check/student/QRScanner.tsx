// src/components/check/student/QRScanner.tsx
import React, { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X } from 'lucide-react';
import LoadingOverlay from '@/components/common/LoadingOverlay';

interface QRScannerProps {
  onScan: (qrData: string) => void;
  onClose: () => void;
  isProcessing: boolean;
  onError: (message: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, isProcessing, onError }) => {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isInitializedRef = useRef(false);
  const qrCodeRegionId = 'qr-reader';

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initScanner = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));

        // Câmera e GPS só existem em contexto seguro (HTTPS ou localhost).
        // Em http://IP o navegador nem expõe a API — não chega a pedir permissão.
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          onError(
            'A câmera só funciona em conexão segura (HTTPS). ' +
            `Você está acessando por ${window.location.protocol}//${window.location.host}. ` +
            'Abra o sistema por um endereço https:// para escanear o QR Code.'
          );
          onClose();
          return;
        }

        const element = document.getElementById(qrCodeRegionId);
        if (!element) {
          console.error('Elemento não encontrado');
          return;
        }

        element.innerHTML = '';

        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop();
            await html5QrCodeRef.current.clear();
          } catch (err) {
            console.log('Limpeza preventiva:', err);
          }
        }

        const html5QrCode = new Html5Qrcode(qrCodeRegionId, {
          // Usa o decodificador nativo do navegador quando existe (Android/Chrome).
          // No iOS não existe e a biblioteca cai no decodificador próprio.
          useBarCodeDetectorIfSupported: true,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        html5QrCodeRef.current = html5QrCode;

        const config = {
          // Mais tentativas de leitura por segundo
          fps: 20,

          // SEM qrbox de proposito: a biblioteca recorta o video na area da caixa
          // e descarta o resto. Com o QR preenchendo a caixa, a zona silenciosa
          // (margem clara que o decodificador usa para achar os cantos) ficava
          // fora do recorte e a leitura falhava. Sem recorte, vale o quadro
          // inteiro — o codigo e lido perto, longe, grande ou pequeno.
          // As marcacoes rosa na tela seguem como guia visual, nao como limite.

          // QR Code não é espelhado; sem isto a biblioteca testa cada quadro
          // duas vezes (normal e invertido) e gasta metade do tempo à toa.
          disableFlip: true,

          // Resolução maior = QR legível de mais longe e com menos foco perfeito.
          // Sem aspectRatio forçado: deixa a câmera usar o formato nativo dela.
          videoConstraints: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          } as MediaTrackConstraints,
        };

        try {
          await html5QrCode.start(
            { facingMode: { ideal: 'environment' } },
            config,
            (decodedText) => onScan(decodedText),
            () => {}
          );
        } catch (err) {
          await html5QrCode.start(
            { facingMode: 'user' },
            config,
            (decodedText) => onScan(decodedText),
            () => {}
          );
        }
      } catch (err: any) {
        let errorMessage = 'Erro ao acessar a câmera.';

        if (err.name === 'NotAllowedError') {
          errorMessage = 'Permissão de câmera negada.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'Nenhuma câmera encontrada.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Câmera em uso por outro app.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Câmera não suporta as configurações.';
        }

        onError(errorMessage);
        onClose();
      }
    };

    initScanner();

    return () => {
      const cleanup = async () => {
        if (html5QrCodeRef.current) {
          try {
            const isScanning = html5QrCodeRef.current.isScanning;
            if (isScanning) {
              await html5QrCodeRef.current.stop();
            }
            await html5QrCodeRef.current.clear();
          } catch (err) {
            console.log('Cleanup error:', err);
          }
          html5QrCodeRef.current = null;
        }

        const element = document.getElementById(qrCodeRegionId);
        if (element) {
          element.innerHTML = '';
        }
      };

      cleanup();
      isInitializedRef.current = false;
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg overflow-visible">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#B7294A] to-[#9a1f3d] px-4 sm:px-6 py-4 sm:py-6 text-white flex justify-between items-center gap-3 sm:gap-4 relative z-10 rounded-t-2xl">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Escanear QR Code</h2>
            <p className="text-xs sm:text-sm md:text-base text-white/90">
              Aponte a câmera para o código
            </p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors flex-shrink-0"
            disabled={isProcessing}
            aria-label="Fechar câmera"
          >
            <X size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Camera Container */}
        <div 
          className="relative bg-black flex items-center justify-center overflow-hidden rounded-b-2xl" 
          style={{ minHeight: '300px', height: '60vh', maxHeight: '500px' }}
        >
          <div id={qrCodeRegionId} style={{ width: '100%', height: '100%' }} />
          <LoadingOverlay
            isVisible={isProcessing}
            message="Validando QR Code..."
          />
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex justify-center rounded-b-2xl">
          <p className="text-gray-600 text-xs sm:text-sm">
            {isProcessing ? 'Processando...' : 'Posicione o código na câmera'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;