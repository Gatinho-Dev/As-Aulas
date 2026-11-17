import { describe, expect, it } from 'vitest';
import { compararFracoes, descreverFracao, limitarFracao, simplificar, valorDecimal } from './fracoes';

describe('frações', () => {
  it('limita denominador e numerador às regras do explorador', () => {
    expect(limitarFracao(9, 3)).toEqual({ numerador: 3, denominador: 3 });
    expect(limitarFracao(-2, 1)).toEqual({ numerador: 0, denominador: 2 });
    expect(limitarFracao(4, 30)).toEqual({ numerador: 4, denominador: 12 });
  });

  it('simplifica frações', () => {
    expect(simplificar({ numerador: 4, denominador: 8 })).toEqual({ numerador: 1, denominador: 2 });
    expect(simplificar({ numerador: 0, denominador: 5 })).toEqual({ numerador: 0, denominador: 1 });
  });

  it('compara frações pelo valor real', () => {
    expect(compararFracoes({ numerador: 1, denominador: 2 }, { numerador: 2, denominador: 3 })).toBe(-1);
    expect(compararFracoes({ numerador: 2, denominador: 4 }, { numerador: 1, denominador: 2 })).toBe(0);
    expect(compararFracoes({ numerador: 3, denominador: 4 }, { numerador: 1, denominador: 2 })).toBe(1);
  });

  it('calcula o valor decimal e descreve a fração', () => {
    expect(valorDecimal({ numerador: 1, denominador: 4 })).toBe(0.25);
    expect(descreverFracao({ numerador: 0, denominador: 4 })).toContain('Nenhuma parte');
    expect(descreverFracao({ numerador: 3, denominador: 3 })).toContain('inteiro');
    expect(descreverFracao({ numerador: 1, denominador: 2 })).toContain('50%');
  });
});
