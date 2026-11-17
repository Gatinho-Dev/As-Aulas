import { describe, expect, it } from 'vitest';
import { validarInterface } from './contrato';

function base(blocos: unknown[], acoes: unknown[] = []) {
  return { tipo: 'interface', titulo: 'Frações', resumo: 'Entenda as partes do todo.', blocos, acoes };
}

describe('validarInterface', () => {
  it('rejeita blocos de tipo desconhecido', () => {
    expect(validarInterface(base([{ kind: 'executar_script', texto: 'x' }]))).toBeNull();
  });

  it('aceita texto e questão válida', () => {
    const ui = validarInterface(
      base([
        { kind: 'text', titulo: 'Introdução', texto: 'Uma fração representa parte de um todo.' },
        { kind: 'multiple_choice', pergunta: 'Qual é metade?', opcoes: ['1/2', '1/3'], correta: 0, explicacao: 'Uma de duas partes.' },
      ]),
    );
    expect(ui?.blocos).toHaveLength(2);
    expect(ui?.blocos[1]).toMatchObject({ tipo: 'multiple_choice', correta: 0 });
  });

  it('descarta questão com gabarito fora das alternativas', () => {
    expect(validarInterface(base([{ kind: 'multiple_choice', pergunta: 'x', opcoes: ['a', 'b'], correta: 5 }]))).toBeNull();
  });

  it('rejeita fração fora das regras', () => {
    expect(validarInterface(base([{ kind: 'fraction', numerador: 9, denominador: 2 }]))).toBeNull();
    const ok = validarInterface(base([{ kind: 'fraction', numerador: 1, denominador: 4 }]));
    expect(ok?.blocos[0]).toMatchObject({ tipo: 'fraction', numerador: 1, denominador: 4 });
  });

  it('rejeita resposta do tipo texto e ações desconhecidas', () => {
    expect(validarInterface({ tipo: 'texto', blocos: [] })).toBeNull();
    const ui = validarInterface(
      base([{ kind: 'text', texto: 'oi' }], [
        { rotulo: 'Executar', acao: 'exec' },
        { rotulo: 'Testar', acao: 'testar' },
      ]),
    );
    expect(ui?.acoes).toEqual([{ rotulo: 'Testar', acao: 'testar' }]);
  });

  it('limita a quantidade de blocos renderizados', () => {
    const blocos = Array.from({ length: 12 }, () => ({ kind: 'text', texto: 'parágrafo' }));
    expect(validarInterface(base(blocos))?.blocos).toHaveLength(8);
  });
});
