import type { ReactNode } from 'react';

// Marcadores suportados na resposta da IA: negrito, itálico e código inline.
const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g;

const CODIGO = 'rounded bg-slate-200 px-1 py-0.5 font-mono text-[0.85em] dark:bg-slate-700';

function inline(texto: string, chave: string): ReactNode[] {
  return texto
    .split(INLINE)
    .filter((parte) => parte !== '')
    .map((parte, i) => {
      const k = `${chave}-${i}`;
      if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
        return <strong key={k}>{parte.slice(2, -2)}</strong>;
      }
      if (parte.startsWith('__') && parte.endsWith('__') && parte.length > 4) {
        return <strong key={k}>{parte.slice(2, -2)}</strong>;
      }
      if (parte.startsWith('`') && parte.endsWith('`') && parte.length > 2) {
        return (
          <code key={k} className={CODIGO}>
            {parte.slice(1, -1)}
          </code>
        );
      }
      if (
        (parte.startsWith('*') && parte.endsWith('*') && parte.length > 2) ||
        (parte.startsWith('_') && parte.endsWith('_') && parte.length > 2)
      ) {
        return <em key={k}>{parte.slice(1, -1)}</em>;
      }
      return parte;
    });
}

type Bloco =
  | { tipo: 'p'; linhas: string[] }
  | { tipo: 'lista'; ordenada: boolean; itens: string[] }
  | { tipo: 'titulo'; nivel: number; texto: string };

function parsear(md: string): Bloco[] {
  const blocos: Bloco[] = [];
  let paragrafo: { tipo: 'p'; linhas: string[] } | null = null;
  let lista: { tipo: 'lista'; ordenada: boolean; itens: string[] } | null = null;

  for (const bruta of md.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) {
      paragrafo = null;
      lista = null;
      continue;
    }

    const titulo = /^(#{1,6})\s+(.*)$/.exec(linha);
    if (titulo) {
      paragrafo = null;
      lista = null;
      blocos.push({ tipo: 'titulo', nivel: titulo[1].length, texto: titulo[2] });
      continue;
    }

    const item = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(linha);
    if (item) {
      const ordenada = /^\d+[.)]/.test(linha);
      if (!lista || lista.ordenada !== ordenada) {
        paragrafo = null;
        lista = { tipo: 'lista', ordenada, itens: [] };
        blocos.push(lista);
      }
      lista.itens.push(item[1]);
      continue;
    }

    if (!paragrafo) {
      lista = null;
      paragrafo = { tipo: 'p', linhas: [] };
      blocos.push(paragrafo);
    }
    paragrafo.linhas.push(linha);
  }

  return blocos;
}

/** Exibe o texto da IA com negrito, itálico, código, listas e títulos simples. */
export default function Markdown({ texto }: { texto: string }) {
  const blocos = parsear(texto);

  return (
    <div className="space-y-2 break-words leading-relaxed">
      {blocos.map((bloco, i) => {
        if (bloco.tipo === 'titulo') {
          const Tag = bloco.nivel <= 2 ? 'h3' : 'h4';
          return (
            <Tag key={i} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {inline(bloco.texto, `t${i}`)}
            </Tag>
          );
        }

        if (bloco.tipo === 'lista') {
          const Tag = bloco.ordenada ? 'ol' : 'ul';
          return (
            <Tag
              key={i}
              className={`space-y-1 pl-5 ${bloco.ordenada ? 'list-decimal' : 'list-disc'}`}
            >
              {bloco.itens.map((it, j) => (
                <li key={j}>{inline(it, `l${i}-${j}`)}</li>
              ))}
            </Tag>
          );
        }

        return (
          <p key={i}>
            {bloco.linhas.map((linha, j) => (
              <span key={j}>
                {inline(linha, `p${i}-${j}`)}
                {j < bloco.linhas.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
