import type { AmostraRosto, PoseCabeca } from './faceDetection';

/**
 * Prova de vida por movimento da cabeça, antes de liberar a foto do check-in.
 *
 * A pessoa recebe duas instruções sorteadas na hora — uma na horizontal e uma
 * na vertical — e precisa cumpri-las na ordem, voltando ao centro entre elas.
 *
 * O QUE ISTO RESOLVE: apontar a câmera para uma foto impressa, para a foto no
 * crachá ou para uma imagem parada na tela de outro celular deixa de funcionar,
 * porque nada ali se mexe quando o sistema pede.
 *
 * O QUE ISTO NÃO RESOLVE: um vídeo da pessoa mexendo a cabeça pode passar, e
 * inclinar fisicamente uma foto impressa também muda os pontos do rosto. Isto
 * eleva o custo da fraude casual, não é prova de identidade.
 *
 * As instruções são sorteadas a cada tentativa de propósito: com ordem fixa,
 * um vídeo gravado uma vez passaria sempre.
 *
 * A última etapa exige voltar ao centro antes de concluir, e quem chama deve
 * tirar a foto nesse instante. Deixar a foto para um clique posterior abriria
 * a brecha principal: cumprir os movimentos com o próprio rosto e só então
 * apontar a câmera para a foto de um colega ausente.
 */

export type Direcao = 'esquerda' | 'direita' | 'cima' | 'baixo';

export type EtapaProvaDeVida =
  /** Sem rosto utilizável no quadro. */
  | 'procurando'
  /** Rosto presente; medindo a pose neutra desta pessoa. */
  | 'calibrando'
  /** Esperando o movimento pedido. */
  | 'desafio'
  /** Movimento aceito; esperando o rosto voltar ao centro. */
  | 'voltando'
  /** Tudo cumprido: a foto pode ser tirada. */
  | 'concluido';

export interface EstadoProvaDeVida {
  etapa: EtapaProvaDeVida;
  /** Texto pronto para a tela. */
  instrucao: string;
  /** Direção pedida agora, para desenhar a seta. */
  direcao: Direcao | null;
  movimentosFeitos: number;
  totalMovimentos: number;
  /** Aviso extra quando a pessoa está demorando no mesmo passo. */
  dica: string | null;
}

export interface AjustesProvaDeVida {
  /**
   * Quanto a cabeça precisa girar, em unidades de distância entre as orelhas,
   * para o movimento horizontal contar.
   *
   * Os dois limiares foram estimados pela geometria do rosto e precisam ser
   * conferidos num aparelho real: o modo de diagnóstico da tela de captura
   * mostra os valores ao vivo. Valor alto demais trava quem move pouco; baixo
   * demais aceita tremor de mão.
   */
  limiarYaw: number;
  /** O mesmo na vertical, em unidades de distância entre os olhos. */
  limiarPitch: number;
}

export const AJUSTES_PADRAO: AjustesProvaDeVida = {
  limiarYaw: 0.11,
  limiarPitch: 0.13,
};

/** Amostras seguidas e estáveis para fixar a pose neutra (~0,8 s a 6 por segundo). */
const JANELA_CALIBRACAO = 5;

/**
 * Fração do limiar que ainda conta como "de volta ao centro".
 *
 * Era 0,4 e exigia voltar quase exatamente à pose calibrada, o que prendia a
 * pessoa no passo de volta: depois de girar a cabeça ninguém reencontra o
 * ângulo anterior com essa precisão, e a mão que segura o celular também se
 * mexe no caminho.
 */
const FATOR_CENTRO = 0.6;

/**
 * Folga no eixo que NÃO foi pedido. Serve só para a foto não sair com o rosto
 * de lado; cobrar precisão nele travava quem apenas reposicionou o celular
 * entre um movimento e outro.
 */
const FATOR_EIXO_LIVRE = 1.0;

/** Amostras seguidas no centro para o passo de volta ser aceito. */
const AMOSTRAS_CENTRO = 2;

/**
 * A pose neutra é reancorada enquanto a pessoa espera o movimento, desde que
 * ela esteja parada e perto da referência atual.
 *
 * Sem isto a referência envelhece: entre ler a instrução na tela e executar o
 * movimento, quase todo mundo muda a altura do celular e a inclinação do
 * rosto, e o desafio passa a ser medido contra uma pose que não existe mais.
 * Era o que travava o passo de volta com o rosto já de frente.
 *
 * Isto não abre brecha: girar devagar até a posição pedida faz a referência
 * acompanhar, e o movimento continua tendo de ser feito por inteiro a partir
 * de onde a cabeça realmente descansa.
 */
const JANELA_REPOUSO = 4;
/**
 * Quanto a pose pode oscilar e ainda contar como parada. É a mesma folga da
 * calibração de propósito: mais apertado aqui significaria que quem conseguiu
 * calibrar não consegue ser cobrado depois, e tremor de mão em celular é
 * normal.
 */
const ESTABILIDADE_REANCORA = 0.5;

/**
 * Travado neste passo por tanto tempo: remede a pose neutra do zero.
 *
 * É a rede de segurança para o desvio grande, maior do que a reancoragem
 * acompanha — por exemplo quem calibrou olhando a tela e depois apoiou o
 * celular em outra altura. Sem isto a pessoa fica presa sem saber por quê.
 * Os movimentos já cumpridos não são perdidos.
 */
const MS_PARA_RECALIBRAR = 8000;

/** Rosto sumido por tantas amostras seguidas reinicia tudo (~1 s). */
const AMOSTRAS_SEM_ROSTO = 6;

/** Depois disto no mesmo passo, a tela passa a dar uma dica. */
const MS_PARA_DICA = 12000;

/**
 * Travado por muito tempo no mesmo passo: a dica passa a apontar a saída real.
 * Não existe atalho automático de propósito — liberar a foto por desistência
 * daria a qualquer um um caminho para pular a verificação, bastando esperar.
 * Quem não consegue mover a cabeça é marcado pelo professor, que já tem a
 * marcação manual.
 */
const MS_PARA_AJUDA = 45000;

const INSTRUCOES: Record<Direcao, string> = {
  esquerda: 'Vire o rosto para a esquerda',
  direita: 'Vire o rosto para a direita',
  cima: 'Incline o rosto para cima',
  baixo: 'Incline o rosto para baixo',
};

function sortear<T>(opcoes: readonly T[]): T {
  return opcoes[Math.floor(Math.random() * opcoes.length)];
}

/**
 * Uma direção de cada eixo, em ordem sorteada. Dois movimentos bastam para
 * provar reação ao comando e mantêm o check-in rápido numa fila de turma.
 */
function sortearSequencia(): Direcao[] {
  const horizontal = sortear(['esquerda', 'direita'] as const);
  const vertical = sortear(['cima', 'baixo'] as const);
  return Math.random() < 0.5 ? [horizontal, vertical] : [vertical, horizontal];
}

function mediana(valores: number[]): number {
  const ordenado = [...valores].sort((a, b) => a - b);
  return ordenado[Math.floor(ordenado.length / 2)];
}

function amplitude(valores: number[]): number {
  return Math.max(...valores) - Math.min(...valores);
}

/** Quanto a pose atual se afastou da neutra, no eixo que a direção pede. */
function desvio(pose: PoseCabeca, base: PoseCabeca, direcao: Direcao): number {
  switch (direcao) {
    case 'direita':
      return pose.yaw - base.yaw;
    case 'esquerda':
      return base.yaw - pose.yaw;
    case 'baixo':
      return pose.pitch - base.pitch;
    case 'cima':
      return base.pitch - pose.pitch;
  }
}

export interface ProvaDeVida {
  /** Processa uma amostra do detector e devolve o estado para a tela. */
  avaliar: (amostra: AmostraRosto) => EstadoProvaDeVida;
  /** Volta ao início, por exemplo quando a pessoa decide tirar outra foto. */
  reiniciar: () => void;
}

export function criarProvaDeVida(ajustes: AjustesProvaDeVida = AJUSTES_PADRAO): ProvaDeVida {
  let etapa: EtapaProvaDeVida = 'procurando';
  let sequencia: Direcao[] = sortearSequencia();
  let indice = 0;
  let base: PoseCabeca | null = null;
  let janela: PoseCabeca[] = [];
  let semRosto = 0;
  let noCentro = 0;
  let janelaVolta: PoseCabeca[] = [];
  let janelaRepouso: PoseCabeca[] = [];
  let ultimaDirecao: Direcao | null = null;
  /** Começo do movimento atual; sobrevive à recalibração, ao contrário de `desde`. */
  let desdeMovimento = Date.now();
  /** Só vale cobrar o movimento depois de ver a cabeça parada. */
  let repousoConfirmado = false;
  let desde = Date.now();

  const irPara = (nova: EtapaProvaDeVida) => {
    etapa = nova;
    desde = Date.now();
  };

  /** Remede a pose neutra sem perder os movimentos já cumpridos. */
  const recalibrar = () => {
    base = null;
    janela = [];
    janelaRepouso = [];
    repousoConfirmado = false;
    noCentro = 0;
    janelaVolta = [];
    irPara('calibrando');
  };

  const reiniciar = () => {
    etapa = 'procurando';
    sequencia = sortearSequencia();
    indice = 0;
    base = null;
    janela = [];
    semRosto = 0;
    noCentro = 0;
    janelaVolta = [];
    janelaRepouso = [];
    repousoConfirmado = false;
    ultimaDirecao = null;
    desde = Date.now();
    desdeMovimento = Date.now();
  };

  const estado = (dica: string | null = null): EstadoProvaDeVida => {
    const direcao = etapa === 'desafio' ? sequencia[indice] : null;
    const instrucao =
      etapa === 'procurando'
        ? 'Enquadre seu rosto'
        : etapa === 'calibrando'
          ? 'Fique de frente, parado por um instante'
          : etapa === 'desafio'
            ? INSTRUCOES[sequencia[indice]]
            : etapa === 'voltando'
              ? 'Volte a ficar de frente'
              : 'Pronto!';

    return {
      etapa,
      instrucao,
      direcao,
      movimentosFeitos: indice,
      totalMovimentos: sequencia.length,
      dica,
    };
  };

  /** Dica conforme o tempo parado no mesmo passo. */
  const dicaPorTempo = (comum: string): string | null => {
    const parado = Date.now() - desdeMovimento;
    if (parado > MS_PARA_AJUDA) {
      return 'Se não conseguir, peça ao professor para marcar sua presença.';
    }
    return parado > MS_PARA_DICA ? comum : null;
  };

  const avaliar = (amostra: AmostraRosto): EstadoProvaDeVida => {
    // Sem pose não dá para medir movimento. Rosto sumido por tempo suficiente
    // reinicia tudo: impede trocar de pessoa no meio da sequência.
    if (!amostra.rosto || !amostra.pose) {
      semRosto += 1;
      if (semRosto >= AMOSTRAS_SEM_ROSTO) {
        reiniciar();
      }
      return estado();
    }
    semRosto = 0;
    const pose = amostra.pose;

    switch (etapa) {
      case 'procurando': {
        janela = [pose];
        irPara('calibrando');
        return estado();
      }

      case 'calibrando': {
        janela = [...janela, pose].slice(-JANELA_CALIBRACAO);
        if (janela.length < JANELA_CALIBRACAO) return estado();

        // Só fixa a neutra com a cabeça parada: calibrar no meio de um giro
        // deixaria a referência torta e o desafio seguinte impossível.
        const paradoNoYaw = amplitude(janela.map((p) => p.yaw)) < ajustes.limiarYaw * 0.5;
        const paradoNoPitch = amplitude(janela.map((p) => p.pitch)) < ajustes.limiarPitch * 0.5;
        if (!paradoNoYaw || !paradoNoPitch) {
          return estado(dicaPorTempo('Segure o celular firme por um instante'));
        }

        base = {
          yaw: mediana(janela.map((p) => p.yaw)),
          pitch: mediana(janela.map((p) => p.pitch)),
        };
        irPara('desafio');
        return estado();
      }

      case 'desafio': {
        if (!base) {
          reiniciar();
          return estado();
        }

        // Onde a cabeça está descansando AGORA. A referência da calibração
        // envelhece: entre ler a instrução e executá-la, quase todo mundo muda
        // a altura do celular e a inclinação do rosto.
        janelaRepouso = [...janelaRepouso, pose].slice(-JANELA_REPOUSO);
        if (janelaRepouso.length === JANELA_REPOUSO) {
          const yaws = janelaRepouso.map((p) => p.yaw);
          const pitches = janelaRepouso.map((p) => p.pitch);
          const imovel =
            amplitude(yaws) < ajustes.limiarYaw * ESTABILIDADE_REANCORA &&
            amplitude(pitches) < ajustes.limiarPitch * ESTABILIDADE_REANCORA;
          if (imovel) {
            base = { yaw: mediana(yaws), pitch: mediana(pitches) };
            repousoConfirmado = true;
          }
        }

        // Travado: remede do zero, sem perder os movimentos já cumpridos.
        if (Date.now() - desde > MS_PARA_RECALIBRAR) {
          recalibrar();
          return estado(dicaPorTempo('Fique parado um instante para reajustar'));
        }

        // Nada é cobrado antes de ver a pessoa parada: sem isto, uma diferença
        // entre a pose calibrada e a de repouso contaria como se o movimento
        // já tivesse sido feito, e bastava segurar o celular noutro ângulo
        // para ganhar um desafio de graça.
        if (!repousoConfirmado) {
          return estado(dicaPorTempo('Fique de frente por um instante'));
        }

        const direcao = sequencia[indice];
        const limiar = direcao === 'esquerda' || direcao === 'direita'
          ? ajustes.limiarYaw
          : ajustes.limiarPitch;

        if (desvio(pose, base, direcao) >= limiar) {
          ultimaDirecao = direcao;
          noCentro = 0;
          janelaVolta = [];
          janelaRepouso = [];
          irPara('voltando');
          return estado();
        }

        return estado(
          dicaPorTempo('Movimente a cabeça um pouco mais, devagar, sem sair do quadro'),
        );
      }

      case 'voltando': {
        if (!base) {
          reiniciar();
          return estado();
        }

        // Só o eixo que acabou de ser pedido precisa desfazer o movimento. O
        // outro leva uma folga larga: o que importa ali é a foto não sair de
        // lado, não medir precisão.
        const horizontal = ultimaDirecao === 'esquerda' || ultimaDirecao === 'direita';
        const desfeito = horizontal
          ? Math.abs(pose.yaw - base.yaw) < ajustes.limiarYaw * FATOR_CENTRO
          : Math.abs(pose.pitch - base.pitch) < ajustes.limiarPitch * FATOR_CENTRO;
        const outroEixoOk = horizontal
          ? Math.abs(pose.pitch - base.pitch) < ajustes.limiarPitch * FATOR_EIXO_LIVRE
          : Math.abs(pose.yaw - base.yaw) < ajustes.limiarYaw * FATOR_EIXO_LIVRE;

        if (!desfeito || !outroEixoOk) {
          noCentro = 0;
          janelaVolta = [];
          if (Date.now() - desde > MS_PARA_RECALIBRAR) {
            recalibrar();
            return estado(dicaPorTempo('Fique parado um instante para reajustar'));
          }
          return estado(dicaPorTempo('Centralize o rosto, de frente'));
        }

        janelaVolta = [...janelaVolta, pose].slice(-AMOSTRAS_CENTRO);
        noCentro += 1;
        if (noCentro < AMOSTRAS_CENTRO) return estado();

        // Reancora a pose neutra na posição de agora. Entre um movimento e
        // outro a pessoa muda a altura do celular e a postura, e cobrar o
        // movimento seguinte contra uma referência velha vai acumulando erro.
        base = {
          yaw: mediana(janelaVolta.map((p) => p.yaw)),
          pitch: mediana(janelaVolta.map((p) => p.pitch)),
        };

        noCentro = 0;
        janelaVolta = [];
        janelaRepouso = [];
        repousoConfirmado = false;
        indice += 1;
        desdeMovimento = Date.now();
        // Terminar no centro é de propósito: a foto sai com o rosto de frente.
        irPara(indice >= sequencia.length ? 'concluido' : 'desafio');
        return estado();
      }

      case 'concluido':
        return estado();
    }
  };

  return { avaliar, reiniciar };
}
