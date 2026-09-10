/**
 * Monta as janelas de check-in/checkout a partir do horário da atividade.
 *
 * O formulário pede apenas data + horário de início + horário de término;
 * as quatro janelas saem daqui, e o usuário só abre o ajuste manual se
 * precisar de algo fora do padrão.
 */

/** Minutos antes do início em que o check-in abre */
export const CHECKIN_OPENS_BEFORE_MIN = 15;
/** Minutos depois do início em que o check-in fecha */
export const CHECKIN_CLOSES_AFTER_MIN = 30;
/** Minutos antes do término em que o checkout abre */
export const CHECKOUT_OPENS_BEFORE_MIN = 15;
/** Minutos depois do término em que o checkout fecha */
export const CHECKOUT_CLOSES_AFTER_MIN = 30;

export interface ScheduleWindows {
  startDate: string;
  endDate: string;
  checkinStart: string;
  checkinEnd: string;
  checkoutStart: string;
  checkoutEnd: string;
}

/** Date -> "YYYY-MM-DDTHH:mm" (formato do input datetime-local, sem fuso) */
export const toDateTimeLocal = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

const shift = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * 60_000);

/**
 * Deriva as seis datas a partir de data + horários.
 * Usa objetos Date, então virada de dia (atividade às 23h50, por exemplo)
 * é tratada corretamente.
 */
export const buildSchedule = (
  date: string,
  startTime: string,
  endTime: string,
  endDate?: string
): ScheduleWindows | null => {
  if (!date || !startTime || !endTime) return null;

  const start = new Date(`${date}T${startTime}`);
  const end = new Date(`${endDate || date}T${endTime}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  let checkinEnd = shift(start, CHECKIN_CLOSES_AFTER_MIN);
  let checkoutStart = shift(end, -CHECKOUT_OPENS_BEFORE_MIN);

  // Em atividades curtas (menos de 45 min) as duas janelas se sobreporiam, e o
  // backend recusa: o check-in precisa fechar antes do checkout abrir.
  // Nesse caso as duas se encontram no meio da atividade.
  if (checkinEnd.getTime() > checkoutStart.getTime()) {
    const meio = new Date((start.getTime() + end.getTime()) / 2);
    checkinEnd = meio;
    checkoutStart = meio;
  }

  return {
    startDate: toDateTimeLocal(start),
    endDate: toDateTimeLocal(end),
    checkinStart: toDateTimeLocal(shift(start, -CHECKIN_OPENS_BEFORE_MIN)),
    checkinEnd: toDateTimeLocal(checkinEnd),
    checkoutStart: toDateTimeLocal(checkoutStart),
    checkoutEnd: toDateTimeLocal(shift(end, CHECKOUT_CLOSES_AFTER_MIN)),
  };
};

/** "2026-09-09T19:00" -> "09/09 19:00" */
export const shortDateTime = (dateTimeLocal: string): string => {
  if (!dateTimeLocal) return '—';
  const [d, t] = dateTimeLocal.split('T');
  const [, month, day] = d.split('-');
  return `${day}/${month} ${t?.slice(0, 5) ?? ''}`;
};
