// src/components/check/student/SelfieCapture.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';

interface SelfieCaptureProps {
  onCapture: (photoBase64: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  isCheckout?: boolean;
}

// Qualidade deliberadamente baixa: a foto serve para o professor reconhecer
// quem estava na sala, não para ampliar. Uma turma inteira sobe a foto ao mesmo
// tempo, na mesma antena — cada KB a mais multiplica por 300 no pior momento.
const MAX_DIMENSION = 480;
const JPEG_QUALITY = 0.5;

const SelfieCapture: React.FC<SelfieCaptureProps> = ({
  onCapture,
  onCancel,
  isProcessing,
  isCheckout = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const cancelledRef = useRef(false);

  const start = useCallback(async () => {
      // Mesma restrição da câmera do QR e do GPS: sem contexto seguro o
      // navegador nem expõe a API, não chega a pedir permissão.
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError(
          'A câmera só funciona em conexão segura (HTTPS). ' +
          `Você está acessando por ${window.location.protocol}//${window.location.host}.`
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // facingMode 'user' como preferência, não exigência: em notebook sem
          // câmera frontal declarada, `exact` falharia em vez de usar a que existe.
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        if (cancelledRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') {
          setError('Permissão de câmera negada. Libere o acesso nas configurações do navegador.');
        } else if (err?.name === 'NotFoundError') {
          setError('Nenhuma câmera encontrada neste aparelho.');
        } else {
          setError('Não foi possível abrir a câmera. Tente novamente.');
        }
      }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    start();

    // Liberar o stream ao sair é obrigatório: o iOS não devolve a câmera
    // sozinho, e a próxima leitura de QR abriria com a câmera ocupada.
    return () => {
      cancelledRef.current = true;
      stopStream();
    };
  }, [start]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // O preview do vídeo é espelhado (scale-x-[-1], natural para selfie). Sem
    // espelhar o canvas também, a foto salva sairia invertida em relação ao que
    // o aluno viu ao confirmar. Espelha para o salvo bater com a pré-visualização.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reduzir aqui, e não no servidor: reencodar imagem custa 50-200ms de CPU
    // por foto, e a 10 fotos por segundo isso consumiria mais de um core.
    setPreview(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    stopStream();
    setReady(false);
  };

  const retake = () => {
    setPreview(null);
    setError(null);
    start();
  };

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-700 mb-4">{error}</p>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            {isCheckout ? 'Confirme sua saída' : 'Confirme sua presença'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Tire uma foto para registrar o {isCheckout ? 'checkout' : 'check-in'}
          </p>
        </div>
        <button onClick={onCancel} aria-label="Cancelar" className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      <div className="relative bg-gray-900 aspect-[4/3] max-h-[60vh]">
        {preview ? (
          <img src={preview} alt="Foto capturada" className="w-full h-full object-contain" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            // playsInline + muted são obrigatórios no iOS: sem eles o Safari
            // abre o vídeo em tela cheia em vez de embutir no layout.
            className="w-full h-full object-cover scale-x-[-1]"
          />
        )}
      </div>

      <div className="p-4 flex gap-3">
        {preview ? (
          <>
            <button
              onClick={retake}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} /> Tirar outra
            </button>
            <button
              onClick={() => onCapture(preview)}
              disabled={isProcessing}
              className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {isProcessing ? 'Enviando...' : `Confirmar ${isCheckout ? 'checkout' : 'check-in'}`}
            </button>
          </>
        ) : (
          <button
            onClick={capture}
            disabled={!ready}
            className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Camera size={18} /> {ready ? 'Tirar foto' : 'Abrindo câmera...'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SelfieCapture;
