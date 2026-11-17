import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from './Markdown';

describe('Markdown do Tutor IA', () => {
  it('transforma **texto** em negrito', () => {
    const html = renderToStaticMarkup(
      Markdown({ texto: 'Eu sou o **Tutor IA do As Aulas**. Como posso ajudar?' }),
    );
    expect(html).toContain('<strong>Tutor IA do As Aulas</strong>');
    expect(html).not.toContain('**');
  });

  it('mantém a estrela solta de multiplicação como texto', () => {
    const html = renderToStaticMarkup(Markdown({ texto: 'Lembre que 2 * 3 = 6.' }));
    expect(html).toContain('2 * 3 = 6');
  });

  it('renderiza listas e títulos', () => {
    const html = renderToStaticMarkup(Markdown({ texto: '## Passos\n- primeiro\n- segundo' }));
    expect(html).toContain('<h3');
    expect(html).toContain('<ul');
    expect(html).toContain('<li>primeiro</li>');
    expect(html).toContain('<li>segundo</li>');
  });
});
