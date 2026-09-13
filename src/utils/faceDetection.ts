/**
 * Detecção de rosto no navegador, usada para impedir foto de teto, bolso e
 * dedo na lente no check-in.
 *
 * O que isto NÃO faz: não diz quem é a pessoa, nem se ela está viva na frente
 * da câmera. Alguém ainda pode apontar o celular para a foto de um colega.
 * Serve para garantir que a foto mostra um rosto, que é o mínimo para o
 * professor conseguir conferir presença depois.
 *
 * Caminhos tentados, nesta ordem:
 *
 * 1. FaceDetector nativo, da Shape Detection API. Custa download zero, mas só
 *    existe em parte dos navegadores e, onde existe, nem sempre funciona de
 *    verdade — por isso passa por um autoteste antes de ser aceito.
 * 2. MediaPipe BlazeFace em WebAssembly, primeiro tentando GPU e depois CPU.
 *    A troca para CPU importa: em vários celulares o delegado de GPU falha na
 *    criação, e sem esta segunda tentativa a verificação sumiria justamente
 *    nos aparelhos que mais precisam dela.
 *
 * Se nada funcionar, o detector se declara indisponível e a tela de captura
 * libera a foto sem checagem. Travar o check-in de uma turma por causa de um
 * arquivo que não baixou seria pior que aceitar uma foto ruim.
 */

/** Onde o prebuild deixa o runtime e o modelo. */
const BASE_PATH = '/face';

export interface FaceDetector {
  /** true se há pelo menos um rosto no quadro. */
  detect: (source: HTMLVideoElement) => Promise<boolean>;
  close: () => void;
  /** Qual caminho foi usado, para o diagnóstico. */
  engine: string;
}

/**
 * Registro do que aconteceu na montagem, para o modo de diagnóstico da tela
 * de captura. Sem isto, um aparelho que falha não tem como contar por quê.
 */
export const faceDetectionLog: string[] = [];

function registrar(mensagem: string) {
  faceDetectionLog.push(mensagem);
  console.info(`[face] ${mensagem}`);
}

function descreverErro(erro: unknown): string {
  if (erro instanceof Error) return `${erro.name}: ${erro.message}`;
  return String(erro);
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
 * O nativo é instantâneo, mas há navegadores que expõem o construtor e falham
 * na primeira detecção. Uma chamada de teste num quadro em branco separa os
 * dois casos: o que importa é não lançar, e não o resultado.
 */
async function criarNativo(): Promise<FaceDetector | null> {
  if (typeof window === 'undefined' || !window.FaceDetector) {
    registrar('sem FaceDetector nativo neste navegador');
    return null;
  }
  try {
    const detector = new window.FaceDetector({ maxDetectedFaces: 1, fastMode: true });

    const teste = document.createElement('canvas');
    teste.width = 64;
    teste.height = 64;
    await detector.detect(teste);

    registrar('usando o detector nativo do navegador');
    return {
      engine: 'nativo',
      detect: async (source) => (await detector.detect(source)).length > 0,
      close: () => {},
    };
  } catch (erro) {
    registrar(`detector nativo recusado: ${descreverErro(erro)}`);
    return null;
  }
}

async function criarMediapipe(): Promise<FaceDetector | null> {
  let FilesetResolver;
  let MpFaceDetector;
  try {
    // Import dinâmico: quem já resolveu no nativo nunca baixa este pedaço.
    ({ FilesetResolver, FaceDetector: MpFaceDetector } = await import('@mediapipe/tasks-vision'));
  } catch (erro) {
    registrar(`falha ao carregar o pacote do MediaPipe: ${descreverErro(erro)}`);
    return null;
  }

  let fileset;
  try {
    fileset = await FilesetResolver.forVisionTasks(BASE_PATH);
  } catch (erro) {
    registrar(`falha ao carregar o runtime WebAssembly: ${descreverErro(erro)}`);
    return null;
  }

  // GPU primeiro por ser mais rápido; CPU como segunda chance, porque em
  // muitos celulares só o delegado de CPU inicializa.
  for (const delegate of ['GPU', 'CPU'] as const) {
    try {
      const detector = await MpFaceDetector.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: `${BASE_PATH}/blaze_face_short_range.tflite`,
          delegate,
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
      });

      registrar(`usando MediaPipe com delegado ${delegate}`);
      return {
        engine: `mediapipe/${delegate}`,
        detect: async (source) =>
          detector.detectForVideo(source, performance.now()).detections.length > 0,
        close: () => detector.close(),
      };
    } catch (erro) {
      registrar(`MediaPipe ${delegate} falhou: ${descreverErro(erro)}`);
    }
  }

  return null;
}

/**
 * Monta o detector disponível. Nunca lança: devolve null quando não há
 * nenhum, e quem chama trata como "sem checagem".
 */
export async function criarFaceDetector(): Promise<FaceDetector | null> {
  faceDetectionLog.length = 0;
  const inicio = performance.now();

  const nativo = await criarNativo();
  if (nativo) {
    registrar(`pronto em ${Math.round(performance.now() - inicio)} ms`);
    return nativo;
  }

  const mediapipe = await criarMediapipe();
  if (mediapipe) {
    registrar(`pronto em ${Math.round(performance.now() - inicio)} ms`);
    return mediapipe;
  }

  registrar('nenhum detector disponível; foto liberada sem checagem');
  return null;
}
