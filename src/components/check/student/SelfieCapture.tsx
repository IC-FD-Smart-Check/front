// src/components/check/student/SelfieCapture.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  CheckCircle2,
  RefreshCw,
  ScanFace,
  X,
} from 'lucide-react';
import { criarFaceDetector, type FaceDetector, type PoseCabeca } from '@/utils/faceDetection';
import {
  AJUSTES_PADRAO,
  criarProvaDeVida,
  type Direcao,
  type EstadoProvaDeVida,
  type ProvaDeVida,
} from '@/utils/liveness';

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

// Seis análises por segundo. Mais rápido que o necessário para "tem rosto",
// porém a prova de vida precisa reagir ao movimento enquanto ele acontece: a
// 4 por segundo o aluno gira a cabeça e espera a tela responder. Cada análise
// custa de 10 a 30 ms, então o processador segue quase livre.
const DETECTION_INTERVAL_MS = 160;

// Um quadro isolado sem rosto acontece a toda hora: piscada, movimento, mão na
// frente. Só some a liberação depois de alguns quadros seguidos sem rosto,
// senão o botão piscaria entre ativo e inativo.
const FRAMES_SEM_ROSTO_PARA_BLOQUEAR = 3;

// Rosto detectado mas sem pontos utilizáveis por tantas análises seguidas
// (~4 s) desliga a prova de vida. Sem esta saída, um modelo que devolvesse
// detecção sem pontos deixaria o aluno preso para sempre na tela da foto,
// que é pior do que aceitar a foto sem o movimento.
const ANALISES_SEM_POSE_PARA_DESISTIR = 25;

const SETAS: Record<Direcao, React.ReactNode> = {
  esquerda: <ArrowLeft size={28} />,
  direita: <ArrowRight size={28} />,
  cima: <ArrowUp size={28} />,
  baixo: <ArrowDown size={28} />,
};

/**
 * Diagnóstico ligado por ?facedebug=1, guardado na sessão para sobreviver à
 * navegação até a captura. Existe porque os limiares da prova de vida foram
 * estimados pela geometria do rosto e só um aparelho real com uma pessoa real
 * diz se estão bons. Invisível para o aluno.
 */
function diagnosticoLigado(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).has('facedebug')) {
      sessionStorage.setItem('facedebug', '1');
    }
    return sessionStorage.getItem('facedebug') === '1';
  } catch {
    return new URLSearchParams(window.location.search).has('facedebug');
  }
}

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

  const vidaRef = useRef<ProvaDeVida | null>(null);
  /**
   * null = prova de vida indisponível neste aparelho. Mesma regra do resto:
   * o que não carregou não pode impedir o aluno de marcar presença.
   */
  const [estadoVida, setEstadoVida] = useState<EstadoProvaDeVida | null>(null);

  /**
   * A foto sai sozinha no instante em que a prova de vida termina. Estas duas
   * referências existem por causa disso: a primeira dá ao laço de análise
   * acesso à versão atual da função de captura, e a segunda impede que dois
   * ciclos seguidos disparem duas fotos antes de o laço parar.
   */
  const capturarRef = useRef<() => void>(() => {});
  const jaCapturouRef = useRef(false);
  const semPoseRef = useRef(0);

  const [debug] = useState(diagnosticoLigado);
  const [pose, setPose] = useState<PoseCabeca | null>(null);

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
    //
    // exigirPontos ignora o detector nativo: ele não entrega os pontos do
    // rosto, e sem eles não há como medir movimento. O preço é baixar o
    // MediaPipe também no Chrome do Android, que antes resolvia sem download.
    criarFaceDetector({ exigirPontos: true }).then((detector) => {
      if (cancelledRef.current) {
        detector?.close();
        return;
      }
      detectorRef.current = detector;
      if (!detector) return;

      setRostoDetectado(false);
      if (detector.temPontos) {
        vidaRef.current = criarProvaDeVida();
        setEstadoVida(vidaRef.current.avaliar({ rosto: false, pose: null }));
      }
    });

    // Liberar o stream ao sair é obrigatório: o iOS não devolve a câmera
    // sozinho, e a próxima leitura de QR abriria com a câmera ocupada.
    return () => {
      cancelledRef.current = true;
      pararDeteccao();
      stopStream();
      detectorRef.current?.close();
      detectorRef.current = null;
      vidaRef.current = null;
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
        const amostra = await detector.analisar(video);

        somaMs += performance.now() - inicio;
        amostras += 1;
        if (amostras === 20) {
          console.info(
            `[face] ${detector.engine}: ${Math.round(somaMs / amostras)} ms por análise`,
          );
          somaMs = 0;
          amostras = 0;
        }

        if (amostra.rosto) {
          semRostoRef.current = 0;
          setRostoDetectado(true);
        } else {
          semRostoRef.current += 1;
          if (semRostoRef.current >= FRAMES_SEM_ROSTO_PARA_BLOQUEAR) {
            setRostoDetectado(false);
          }
        }

        // Detecta o rosto mas não consegue medir a pose: insistir travaria o
        // aluno, então a prova de vida sai de cena e vale a checagem simples.
        if (vidaRef.current && amostra.rosto && !amostra.pose) {
          semPoseRef.current += 1;
          if (semPoseRef.current >= ANALISES_SEM_POSE_PARA_DESISTIR) {
            console.warn('[face] sem pontos do rosto; seguindo sem prova de vida');
            vidaRef.current = null;
            setEstadoVida(null);
          }
        } else if (amostra.pose) {
          semPoseRef.current = 0;
        }

        if (vidaRef.current) {
          const estado = vidaRef.current.avaliar(amostra);
          setEstadoVida(estado);
          // Terminou a sequência de frente para a câmera: é agora, antes que
          // dê tempo de trocar o que está na frente da lente.
          if (estado.etapa === 'concluido') capturarRef.current();
        }
        if (debug) setPose(amostra.pose);
      } catch (erro) {
        // Detector quebrou no meio do caminho: desliga a checagem em vez de
        // deixar o aluno preso com o botão inativo.
        console.warn('[face] análise falhou, seguindo sem checagem', erro);
        detectorRef.current = null;
        vidaRef.current = null;
        setRostoDetectado(null);
        setEstadoVida(null);
      } finally {
        analisando = false;
      }
    }, DETECTION_INTERVAL_MS);

    return pararDeteccao;
  }, [ready, preview, debug]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || jaCapturouRef.current) return;
    jaCapturouRef.current = true;

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

  capturarRef.current = capture;

  const retake = () => {
    setPreview(null);
    setError(null);
    jaCapturouRef.current = false;
    semRostoRef.current = 0;
    semPoseRef.current = 0;
    if (detectorRef.current) setRostoDetectado(false);
    // Sequência nova a cada tentativa: repetir a foto não deve repetir os
    // mesmos movimentos, senão bastaria gravar uma vez.
    if (vidaRef.current) {
      vidaRef.current.reiniciar();
      setEstadoVida(vidaRef.current.avaliar({ rosto: false, pose: null }));
    }
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

  const vidaPendente = !!estadoVida && estadoVida.etapa !== 'concluido';
  // Sem prova de vida vale a regra antiga: só o rosto enquadrado.
  const bloqueado = estadoVida ? vidaPendente : rostoDetectado === false;

  const textoBotao = !ready
    ? 'Abrindo câmera...'
    : vidaPendente
      ? 'A foto sai sozinha ao final'
      : bloqueado
        ? 'Enquadre seu rosto'
        : 'Tirar foto';

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

        {/* Instrução da prova de vida. É o guia principal da tela enquanto a
            sequência não termina, por isso ocupa a faixa inferior inteira. */}
        {!preview && ready && estadoVida && (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-3 text-white">
              {estadoVida.etapa === 'desafio' && estadoVida.direcao ? (
                <span className="animate-pulse">{SETAS[estadoVida.direcao]}</span>
              ) : estadoVida.etapa === 'concluido' ? (
                <CheckCircle2 size={22} className="text-green-400" />
              ) : (
                <ScanFace size={22} />
              )}
              <p className="text-sm font-semibold">{estadoVida.instrucao}</p>
            </div>

            {estadoVida.dica && (
              <p className="mt-1.5 text-center text-xs text-white/80">{estadoVida.dica}</p>
            )}

            {/* Progresso: sem isto a pessoa não sabe quantos movimentos faltam. */}
            {estadoVida.etapa !== 'concluido' && (
              <div className="mt-2 flex items-center justify-center gap-1.5">
                {Array.from({ length: estadoVida.totalMovimentos }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i < estadoVida.movimentosFeitos ? 'w-6 bg-green-400' : 'w-3 bg-white/35'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sem prova de vida, segue a dica antiga de enquadramento. */}
        {!preview && ready && !estadoVida && rostoDetectado === false && (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
            <p className="flex items-center justify-center gap-2 text-white text-sm font-medium">
              <ScanFace size={18} /> Enquadre seu rosto
            </p>
          </div>
        )}
      </div>

      {debug && !preview && (
        <div className="px-4 pt-3 text-[11px] leading-snug text-gray-600 bg-gray-50 border-t border-gray-100">
          <p className="font-semibold text-gray-800">
            Diagnóstico · {estadoVida ? estadoVida.etapa : 'prova de vida indisponível'}
          </p>
          <p className="font-mono">
            yaw {pose ? pose.yaw.toFixed(3) : '—'} (limiar ±{AJUSTES_PADRAO.limiarYaw}) · pitch{' '}
            {pose ? pose.pitch.toFixed(3) : '—'} (limiar ±{AJUSTES_PADRAO.limiarPitch})
          </p>
        </div>
      )}

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
            // estadoVida null e rostoDetectado null significam sem checagem
            // disponível, e aí a foto é liberada: o que não carregou não pode
            // impedir o aluno de marcar presença.
            disabled={!ready || bloqueado}
            className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {bloqueado ? <ScanFace size={18} /> : <Camera size={18} />}
            {textoBotao}
          </button>
        )}
      </div>
    </div>
  );
};

export default SelfieCapture;
