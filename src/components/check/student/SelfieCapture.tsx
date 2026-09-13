// src/components/check/student/SelfieCapture.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, ScanFace } from 'lucide-react';
import { criarFaceDetector, type FaceDetector } from '@/utils/faceDetection';

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

// A pergunta é só "tem um rosto enquadrado", e isso não muda dez vezes por
// segundo. A 4 análises por segundo a reação continua imediata para quem está
// se enquadrando, e o processador do celular fica praticamente livre.
const DETECTION_INTERVAL_MS = 250;

// Um quadro isolado sem rosto acontece a toda hora: piscada, movimento, mão na
// frente. Só some a liberação depois de alguns quadros seguidos sem rosto,
// senão o botão piscaria entre ativo e inativo.
const FRAMES_SEM_ROSTO_PARA_BLOQUEAR = 3;

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

  const detectorRef = useRef<FaceDetector | null>(null);
  const loopRef = useRef<number | null>(null);
  const semRostoRef = useRef(0);
  /**
   * null = sem checagem disponível, e nesse caso a foto é liberada. Só false
   * bloqueia o botão, e isso exige um detector funcionando.
   */
  const [rostoDetectado, setRostoDetectado] = useState<boolean | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const pararDeteccao = () => {
    if (loopRef.current !== null) {
      window.clearInterval(loopRef.current);
      loopRef.current = null;
    }
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

    // Carrega o detector em paralelo à permissão e ao aquecimento do sensor,
    // que é tempo que o aluno já espera de qualquer forma.
    criarFaceDetector().then((detector) => {
      if (cancelledRef.current) {
        detector?.close();
        return;
      }
      detectorRef.current = detector;
      if (detector) setRostoDetectado(false);
    });

    // Liberar o stream ao sair é obrigatório: o iOS não devolve a câmera
    // sozinho, e a próxima leitura de QR abriria com a câmera ocupada.
    return () => {
      cancelledRef.current = true;
      pararDeteccao();
      stopStream();
      detectorRef.current?.close();
      detectorRef.current = null;
    };
  }, [start]);

  // Laço de análise: só roda com a câmera aberta e antes da foto sair.
  useEffect(() => {
    if (!ready || preview) {
      pararDeteccao();
      return;
    }

    let analisando = false;
    let somaMs = 0;
    let amostras = 0;

    loopRef.current = window.setInterval(async () => {
      const detector = detectorRef.current;
      const video = videoRef.current;
      // Pula o ciclo se o anterior ainda não terminou: em aparelho lento isso
      // evita empilhar análises e travar a interface.
      if (!detector || !video || analisando || video.readyState < 2) return;

      analisando = true;
      const inicio = performance.now();
      try {
        const achou = await detector.detect(video);

        somaMs += performance.now() - inicio;
        amostras += 1;
        if (amostras === 20) {
          console.info(
            `[face] ${detector.engine}: ${Math.round(somaMs / amostras)} ms por análise`,
          );
          somaMs = 0;
          amostras = 0;
        }

        if (achou) {
          semRostoRef.current = 0;
          setRostoDetectado(true);
        } else {
          semRostoRef.current += 1;
          if (semRostoRef.current >= FRAMES_SEM_ROSTO_PARA_BLOQUEAR) {
            setRostoDetectado(false);
          }
        }
      } catch (erro) {
        // Detector quebrou no meio do caminho: desliga a checagem em vez de
        // deixar o aluno preso com o botão inativo.
        console.warn('[face] análise falhou, seguindo sem checagem', erro);
        detectorRef.current = null;
        setRostoDetectado(null);
      } finally {
        analisando = false;
      }
    }, DETECTION_INTERVAL_MS);

    return pararDeteccao;
  }, [ready, preview]);

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
    pararDeteccao();
    stopStream();
    setReady(false);
  };

  const retake = () => {
    setPreview(null);
    setError(null);
    semRostoRef.current = 0;
    if (detectorRef.current) setRostoDetectado(false);
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

        {/* Dica de enquadramento. Só aparece com detector funcionando e
            enquanto não há rosto: quem já está enquadrado não precisa ler
            nada. */}
        {!preview && ready && rostoDetectado === false && (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
            <p className="flex items-center justify-center gap-2 text-white text-sm font-medium">
              <ScanFace size={18} /> Enquadre seu rosto
            </p>
          </div>
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
            // rostoDetectado === null significa sem checagem disponível, e aí
            // a foto é liberada: detector que não carregou não pode impedir o
            // aluno de marcar presença.
            disabled={!ready || rostoDetectado === false}
            className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {rostoDetectado === false ? <ScanFace size={18} /> : <Camera size={18} />}
            {!ready
              ? 'Abrindo câmera...'
              : rostoDetectado === false
                ? 'Enquadre seu rosto'
                : 'Tirar foto'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SelfieCapture;
