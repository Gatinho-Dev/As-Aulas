export type Fracao = { numerador: number; denominador: number };

export const DENOMINADOR_MIN = 2;
export const DENOMINADOR_MAX = 12;

/** Mantém a fração dentro das regras do explorador: denominador 2..12 e numerador 0..denominador. */
export function limitarFracao(numerador: number, denominador: number): Fracao {
  const d = Math.min(DENOMINADOR_MAX, Math.max(DENOMINADOR_MIN, Math.trunc(denominador) || DENOMINADOR_MIN));
  const n = Math.min(d, Math.max(0, Math.trunc(numerador) || 0));
  return { numerador: n, denominador: d };
}

export function mdc(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y > 0) {
    const resto = x % y;
    x = y;
    y = resto;
  }
  return x || 1;
}

/** Forma irredutível da fração. */
export function simplificar(fracao: Fracao): Fracao {
  const divisor = mdc(fracao.numerador, fracao.denominador);
  return { numerador: fracao.numerador / divisor, denominador: fracao.denominador / divisor };
}

export function valorDecimal(fracao: Fracao): number {
  return fracao.numerador / fracao.denominador;
}

/** Compara duas frações: -1 (a menor), 0 (iguais), 1 (a maior). */
export function compararFracoes(a: Fracao, b: Fracao): -1 | 0 | 1 {
  const diferenca = a.numerador * b.denominador - b.numerador * a.denominador;
  if (diferenca === 0) return 0;
  return diferenca < 0 ? -1 : 1;
}

export function descreverFracao(fracao: Fracao): string {
  if (fracao.numerador === 0) return 'Nenhuma parte pintada de um total de ' + fracao.denominador + '.';
  if (fracao.numerador === fracao.denominador) return 'Todas as ' + fracao.denominador + ' partes estão pintadas: o inteiro.';
  return (
    fracao.numerador +
    ' de ' +
    fracao.denominador +
    ' partes iguais, ou seja, ' +
    (valorDecimal(fracao) * 100).toFixed(0) +
    '% do inteiro.'
  );
}
