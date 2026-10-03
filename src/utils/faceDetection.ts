/**
 * Detecção de rosto no navegador, usada no check-in para impedir foto de teto,
 * bolso e dedo na lente, e para conduzir a prova de vida.
 *
 * O que isto NÃO faz: não diz quem é a pessoa. Mesmo com a prova de vida,
 * alguém pode apresentar um vídeo de outra pessoa. Serve para garantir que a
 * foto mostra um rosto de verdade, reagindo na hora, que é o mínimo para o
 * professor conseguir conferir presença depois.
 *
 * Caminhos tentados, nesta ordem:
 *
 * 1. FaceDetector nativo, da Shape Detection API. Custa download zero, mas só
 *    existe em parte dos navegadores, nem sempre funciona de verdade onde
 *    existe (por isso o autoteste) e NÃO entrega os pontos do rosto — então
 *    não serve para a prova de vida.
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

/**
 * Orientação da cabeça, em unidades relativas ao próprio rosto (não em graus).
 *
 * Os dois valores são razões entre distâncias do rosto, então não dependem do
 * tamanho da pessoa na imagem nem da distância até a câmera. O que importa é
 * a VARIAÇÃO em relação à pose neutra de cada um, porque o valor de repouso
 * muda de rosto para rosto e com o ângulo em que a pessoa segura o celular.
 */
export interface PoseCabeca {
  /** Giro horizontal. Positivo = a pessoa virou para a direita DELA. */
  yaw: number;
  /** Inclinação vertical. Positivo = olhando para baixo. */
  pitch: number;
}

export interface AmostraRosto {
  /** true se há pelo menos um rosto no quadro. */
  rosto: boolean;
  /** Pose do maior rosto; null quando o caminho usado não entrega pontos. */
  pose: PoseCabeca | null;
}

export interface FaceDetector {
  analisar: (source: HTMLVideoElement) => Promise<AmostraRosto>;
  close: () => void;
  /** Qual caminho foi usado, para o diagnóstico. */
  engine: string;
  /** true quando entrega pontos do rosto, exigidos pela prova de vida. */
  temPontos: boolean;
}

export interface OpcoesDetector {
  /**
   * Quando true, o caminho nativo é ignorado: ele não entrega pontos do rosto
   * e a prova de vida ficaria impossível justamente nos navegadores em que ele
   * existe. Custa o download do MediaPipe também nesses aparelhos.
   */
  exigirPontos?: boolean;
}

/**
 * As mensagens vão para o console e não para a tela: qual caminho funcionou,
 * e por que os outros não, é informação de quem mantém o sistema, não do
 * aluno que está marcando presença.
 */
function registrar(mensagem: string) {
  console.info(`[face] ${mensagem}`);
}

function descreverErro(erro: unknown): string {
  if (erro instanceof Error) return `${erro.name}: ${erro.message}`;
  return String(erro);
}

interface Ponto {
  x: number;
  y: number;
}

/**
 * Converte os seis pontos do BlazeFace em giro e inclinação da cabeça.
 *
 * Ordem dos pontos no modelo: olho, olho, ponta do nariz, boca, orelha,
 * orelha. Qual olho é o direito não importa aqui, porque só usamos pontos
 * médios e distâncias absolutas entre o par.
 *
 * Três cuidados que fazem a medida parar de mentir:
 *
 * 1. As coordenadas vêm normalizadas de 0 a 1 em cada eixo, mas a imagem não é
 *    quadrada. Sem corrigir pela proporção, uma distância horizontal e uma
 *    vertical do mesmo tamanho real dariam números diferentes.
 * 2. A linha dos olhos é girada para a horizontal antes de medir. Sem isso,
 *    inclinar a cabeça de lado (encostar a orelha no ombro) contaminaria as
 *    duas medidas.
 * 3. Tudo é dividido por uma distância do próprio rosto, para o valor não
 *    mudar quando a pessoa aproxima ou afasta o celular.
 */
function calcularPose(pontos: Ponto[], proporcao: number): PoseCabeca | null {
  if (pontos.length < 6) return null;

  // Para unidades comparáveis nos dois eixos.
  const quadrado = (p: Ponto): Ponto => ({ x: p.x * proporcao, y: p.y });

  const olhoA = quadrado(pontos[0]);
  const olhoB = quadrado(pontos[1]);
  const nariz = quadrado(pontos[2]);
  const orelhaA = quadrado(pontos[4]);
  const orelhaB = quadrado(pontos[5]);

  const centroOlhos = { x: (olhoA.x + olhoB.x) / 2, y: (olhoA.y + olhoB.y) / 2 };
  const distanciaOlhos = Math.hypot(olhoB.x - olhoA.x, olhoB.y - olhoA.y);
  const distanciaOrelhas = Math.hypot(orelhaB.x - orelhaA.x, orelhaB.y - orelhaA.y);

  // Rosto quase de perfil ou ponto perdido: sem escala confiável, não arrisca.
  if (distanciaOlhos < 1e-4 || distanciaOrelhas < 1e-4) return null;

  // Desfaz a inclinação lateral, girando em torno do centro dos olhos.
  const angulo = Math.atan2(olhoB.y - olhoA.y, olhoB.x - olhoA.x);
  const cos = Math.cos(-angulo);
  const sen = Math.sin(-angulo);
  const girar = (p: Ponto): Ponto => {
    const dx = p.x - centroOlhos.x;
    const dy = p.y - centroOlhos.y;
    return { x: dx * cos - dy * sen, y: dx * sen + dy * cos };
  };

  const narizGirado = girar(nariz);
  const orelhaAGirada = girar(orelhaA);
  const orelhaBGirada = girar(orelhaB);
  const meioOrelhas = (orelhaAGirada.x + orelhaBGirada.x) / 2;

  // Girar virar a cabeça empurra o nariz na direção de uma das orelhas.
  const yawBruto = (narizGirado.x - meioOrelhas) / distanciaOrelhas;

  // A imagem da câmera NÃO é espelhada, mas a tela mostra o vídeo espelhado,
  // como um espelho de verdade. Quem vira para a própria direita se vê indo
  // para a direita da tela, e na imagem crua o nariz vai para a esquerda.
  // O sinal é invertido aqui para "positivo = direita da pessoa", que é a
  // direção que ela enxerga e que as instruções pedem.
  const yaw = -yawBruto;

  // Depois do giro, o centro dos olhos é a origem: o nariz fica abaixo (y
  // positivo). Olhar para baixo afasta o nariz dos olhos; para cima, aproxima.
  const pitch = narizGirado.y / distanciaOlhos;

  return { yaw, pitch };
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
      temPontos: false,
      analisar: async (source) => ({
        rosto: (await detector.detect(source)).length > 0,
        pose: null,
      }),
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
        temPontos: true,
        analisar: async (source) => {
          const { detections } = detector.detectForVideo(source, performance.now());
          if (detections.length === 0) return { rosto: false, pose: null };

          // O maior rosto é o de quem está usando o aparelho. Pegar o primeiro
          // daria o rosto de um colega ao fundo quando ele pontuasse melhor.
          const principal = detections.reduce((maior, atual) => {
            const area = (d: typeof atual) =>
              (d.boundingBox?.width ?? 0) * (d.boundingBox?.height ?? 0);
            return area(atual) > area(maior) ? atual : maior;
          });

          const proporcao = source.videoHeight > 0 ? source.videoWidth / source.videoHeight : 1;
          return {
            rosto: true,
            pose: calcularPose(principal.keypoints ?? [], proporcao),
          };
        },
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
export async function criarFaceDetector(
  opcoes: OpcoesDetector = {},
): Promise<FaceDetector | null> {
  const inicio = performance.now();

  if (!opcoes.exigirPontos) {
    const nativo = await criarNativo();
    if (nativo) {
      registrar(`pronto em ${Math.round(performance.now() - inicio)} ms`);
      return nativo;
    }
  }

  const mediapipe = await criarMediapipe();
  if (mediapipe) {
    registrar(`pronto em ${Math.round(performance.now() - inicio)} ms`);
    return mediapipe;
  }

  registrar('nenhum detector disponível; foto liberada sem checagem');
  return null;
}
