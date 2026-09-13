/**
 * Detecção de rosto no navegador, usada para impedir foto de teto, bolso e
 * dedo na lente no check-in.
 *
 * O que isto NÃO faz: não diz quem é a pessoa, nem se ela está viva na frente
 * da câmera. Alguém ainda pode apontar o celular para a foto de um colega.
 * Serve para garantir que a foto mostra um rosto, que é o mínimo para o
 * professor conseguir conferir presença depois.
 *
 * Dois caminhos, nesta ordem:
 *
 * 1. FaceDetector nativo, da Shape Detection API. Existe no Chrome do Android
 *    e custa zero download, porque usa o detector do próprio sistema.
 * 2. MediaPipe BlazeFace em WebAssembly, para quem não tem o nativo — iPhone,
 *    basicamente. São cerca de 3 MB comprimidos na primeira vez, depois fica
 *    em cache do navegador.
 *
 * Se nenhum dos dois carregar, o detector se declara indisponível e a tela de
 * captura libera a foto sem checagem. Travar o check-in de uma turma por causa
 * de um arquivo que não baixou seria pior que aceitar uma foto ruim.
 */

/** Onde o prebuild deixa o runtime e o modelo. */
const BASE_PATH = '/face';

export type FaceDetectorStatus = 'carregando' | 'pronto' | 'indisponivel';

export interface FaceDetector {
  /** true se há pelo menos um rosto no quadro. */
  detect: (source: HTMLVideoElement) => Promise<boolean>;
  close: () => void;
  /** Qual caminho foi usado, para o log de diagnóstico. */
  engine: 'nativo' | 'mediapipe';
}

interface NativeFaceDetector {
  detect: (source: CanvasImageSource) => Promise<unknown[]>;
}

declare global {
  interface Window {
    FaceDetector?: new (options?: { maxDetectedFaces?: number; fastMode?: boolean }) => NativeFaceDetector;
  }
}

/**
 * O nativo é instantâneo, então vale tentar primeiro mesmo sabendo que boa
 * parte dos aparelhos não tem.
 */
function criarNativo(): FaceDetector | null {
  if (typeof window === 'undefined' || !window.FaceDetector) {
    return null;
  }
  try {
    const detector = new window.FaceDetector({ maxDetectedFaces: 1, fastMode: true });
    return {
      engine: 'nativo',
      detect: async (source) => {
        const faces = await detector.detect(source);
        return faces.length > 0;
      },
      close: () => {},
    };
  } catch {
    // Alguns navegadores expõem o construtor e falham ao instanciar.
    return null;
  }
}

async function criarMediapipe(): Promise<FaceDetector | null> {
  try {
    // Import dinâmico: quem tem detector nativo nunca baixa este pedaço.
    const { FilesetResolver, FaceDetector: MpFaceDetector } = await import('@mediapipe/tasks-vision');

    const fileset = await FilesetResolver.forVisionTasks(BASE_PATH);
    const detector = await MpFaceDetector.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: `${BASE_PATH}/blaze_face_short_range.tflite`,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      minDetectionConfidence: 0.5,
    });

    return {
      engine: 'mediapipe',
      detect: async (source) => {
        const resultado = detector.detectForVideo(source, performance.now());
        return resultado.detections.length > 0;
      },
      close: () => detector.close(),
    };
  } catch (erro) {
    console.warn('[face] MediaPipe indisponível, captura segue sem checagem', erro);
    return null;
  }
}

/**
 * Monta o detector disponível. Nunca lança: devolve null quando não há
 * nenhum, e quem chama trata como "sem checagem".
 */
export async function criarFaceDetector(): Promise<FaceDetector | null> {
  const inicio = performance.now();

  const nativo = criarNativo();
  if (nativo) {
    console.info(`[face] detector nativo pronto em ${Math.round(performance.now() - inicio)} ms`);
    return nativo;
  }

  const mediapipe = await criarMediapipe();
  if (mediapipe) {
    console.info(`[face] MediaPipe pronto em ${Math.round(performance.now() - inicio)} ms`);
    return mediapipe;
  }

  console.info('[face] nenhum detector disponível; foto liberada sem checagem');
  return null;
}
