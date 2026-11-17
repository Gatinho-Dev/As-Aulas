import { describe, expect, it } from 'vitest';
import { corrigirSimulado, percentual } from './simuladoUtils';

describe('corrigirSimulado', () => {
  it('conta acertos e ignora questões em branco', () => {
    const correcao = corrigirSimulado([1, 2, 0], [1, null, 0]);
    expect(correcao.acertos).toBe(2);
    expect(correcao.total).toBe(3);
    expect(correcao.acertou).toEqual([true, false, true]);
  });

  it('não considera resposta nula como acerto quando o gabarito é inválido', () => {
    const correcao = corrigirSimulado([0], [null]);
    expect(correcao.acertos).toBe(0);
  });

  it('calcula o percentual arredondado', () => {
    expect(percentual({ acertos: 2, total: 3, acertou: [true, true, false] })).toBe(67);
    expect(percentual({ acertos: 0, total: 0, acertou: [] })).toBe(0);
  });
});
