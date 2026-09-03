/** Palavras que não entram na sigla do curso */
const STOP_WORDS = new Set(['e', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'para', 'a', 'o']);

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * Sigla do curso a partir do nome.
 * "Análise e Desenvolvimento de Sistemas" -> "ADS"
 * "Engenharia de Software"                -> "ES"
 * "Medicina"                              -> "MED"
 */
export const courseAbbreviation = (courseName: string): string => {
  const words = courseName
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOP_WORDS.has(normalize(word)));

  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();

  return words.map((word) => word[0].toUpperCase()).join('');
};

/**
 * Letra que distingue turmas do mesmo curso e semestre (a "A" de G-ADS-26.2-05N-A-2°).
 * O primeiro segmento é ignorado porque costuma ser o nível do curso ("G" de graduação),
 * e não diferencia uma turma da outra.
 */
export const variantLetter = (externalCode?: string | null): string => {
  if (!externalCode) return '';

  const segments = externalCode.split(/[-.\s_/]+/).filter(Boolean).slice(1);
  const letter = segments.find((segment) => /^[A-Za-z]$/.test(segment));

  return letter ? letter.toUpperCase() : '';
};

/**
 * Nome legível sugerido ao cadastrar a turma pelo atalho da importação.
 * Sem dados suficientes, cai no próprio identificador.
 */
export const suggestClassGroupName = (params: {
  courseName?: string | null;
  semesterNumber?: number | null;
  externalCode?: string | null;
}): string => {
  const { courseName, semesterNumber, externalCode } = params;

  const abbreviation = courseName ? courseAbbreviation(courseName) : '';

  if (!abbreviation || !semesterNumber) {
    return externalCode ?? '';
  }

  const letter = variantLetter(externalCode);

  return `${abbreviation} ${semesterNumber}º semestre${letter ? ` ${letter}` : ''}`;
};
