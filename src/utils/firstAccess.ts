/**
 * Regra única de "primeiro acesso pendente" no front.
 *
 * Existe porque esta condição é consultada em três lugares: a rota protegida,
 * que decide para onde mandar; o interceptor, que trata o 428 do servidor; e a
 * própria tela de primeiro acesso. Quando a regra vivia copiada nesses
 * lugares, acrescentar uma exigência nova em só um deles produzia um ciclo de
 * recarga: a rota liberava, o servidor recusava, e a tela mandava de volta.
 *
 * O espelho desta regra no servidor é AuthenticatedUser.isFirstAccessPending.
 */
export interface FirstAccessUser {
  mustChangePassword?: boolean;
  email?: string | null;
  acceptedTermsVersion?: string | null;
  currentTermsVersion?: string;
}

/** Termos pendentes quando a versão aceita não é a vigente. */
export const termsPending = (user: FirstAccessUser): boolean =>
  !!user.currentTermsVersion && user.acceptedTermsVersion !== user.currentTermsVersion;

export const isFirstAccessPending = (user: FirstAccessUser): boolean =>
  !!user.mustChangePassword || !user.email || termsPending(user);
