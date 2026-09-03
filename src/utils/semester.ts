import type { Semester } from '@/types';

/** Todos os semestres aceitos pelo backend, em ordem (S1..S14) */
export const SEMESTERS: Semester[] = [
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7',
  'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14',
];

/** Converte 'S3' no número 3 */
export const semesterToNumber = (semester: Semester): number =>
  Number(semester.replace('S', ''));

/** Converte 3 em 'S3' */
export const numberToSemester = (value: number): Semester => `S${value}` as Semester;

/** Rótulo exibido ao usuário: 'S3' -> '3º semestre' */
export const semesterLabel = (semester: Semester): string =>
  `${semesterToNumber(semester)}º semestre`;

/** Lista de semestres válidos para um curso com a duração informada */
export const semestersForDuration = (durationInSemesters: number): Semester[] =>
  SEMESTERS.slice(0, durationInSemesters);
