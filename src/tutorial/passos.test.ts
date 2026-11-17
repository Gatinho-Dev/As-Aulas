import { describe, expect, it } from 'vitest';
import { PASSOS_TUTORIAL, chaveSessaoTutorial, passoAnterior, proximoPasso } from './passos';

describe('navegação do tutorial', () => {
  it('avança sem passar do último passo', () => {
    const total = PASSOS_TUTORIAL.length;
    expect(proximoPasso(0, total)).toBe(1);
    expect(proximoPasso(total - 1, total)).toBe(total - 1);
  });

  it('volta sem ficar abaixo do primeiro passo', () => {
    expect(passoAnterior(3)).toBe(2);
    expect(passoAnterior(0)).toBe(0);
  });
});

describe('passos do tutorial', () => {
  it('possui 7 passos, cada um com título, texto e alvos', () => {
    expect(PASSOS_TUTORIAL).toHaveLength(7);
    for (const passo of PASSOS_TUTORIAL) {
      expect(passo.titulo.length).toBeGreaterThan(0);
      expect(passo.texto.length).toBeGreaterThan(0);
      expect(passo.alvos.length).toBeGreaterThan(0);
    }
  });

  it('usa ids únicos', () => {
    const ids = PASSOS_TUTORIAL.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('chave de sessão do tutorial', () => {
  it('isola o estado de cada aluno', () => {
    expect(chaveSessaoTutorial('aluno-a')).not.toBe(chaveSessaoTutorial('aluno-b'));
  });
});
