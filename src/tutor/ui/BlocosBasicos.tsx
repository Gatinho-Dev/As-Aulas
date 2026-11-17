import { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import Markdown from '../Markdown';
import type { Bloco } from './contrato';

const TITULO = 'text-sm font-semibold text-slate-900 dark:text-slate-100';
const CORPO = 'text-sm text-slate-800 dark:text-slate-200';

export function BlocoTexto({ bloco }: { bloco: Extract<Bloco, { tipo: 'text' }> }) {
  return (
    <section>
      {bloco.titulo && <h4 className={`mb-1 ${TITULO}`}>{bloco.titulo}</h4>}
      <div className={CORPO}>
        <Markdown texto={bloco.texto} />
      </div>
    </section>
  );
}

export function BlocoLista({ bloco }: { bloco: Extract<Bloco, { tipo: 'key_points' | 'steps' | 'checklist' }> }) {
  const [marcados, setMarcados] = useState<boolean[]>(() => bloco.itens.map(() => false));

  if (bloco.tipo === 'steps') {
    return (
      <section>
        {bloco.titulo && <h4 className={`mb-2 ${TITULO}`}>{bloco.titulo}</h4>}
        <ol className="space-y-2">
          {bloco.itens.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
              >
                {i + 1}
              </span>
              <div className={CORPO}>
                <Markdown texto={item} />
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (bloco.tipo === 'checklist') {
    return (
      <section>
        {bloco.titulo && <h4 className={`mb-2 ${TITULO}`}>{bloco.titulo}</h4>}
        <ul className="space-y-1">
          {bloco.itens.map((item, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg p-1 text-sm">
                <input
                  type="checkbox"
                  checked={marcados[i] ?? false}
                  onChange={() => setMarcados((atual) => atual.map((v, k) => (k === i ? !v : v)))}
                  className="mt-0.5 size-4 shrink-0"
                />
                <span className={marcados[i] ? 'text-slate-500 line-through dark:text-slate-400' : CORPO}>{item}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section>
      {bloco.titulo && (
        <h4 className={`mb-2 flex items-center gap-1 ${TITULO}`}>
          <CheckSquare className="size-4 text-indigo-700 dark:text-indigo-300" aria-hidden />
          {bloco.titulo}
        </h4>
      )}
      <ul className="list-disc space-y-1 pl-5">
        {bloco.itens.map((item, i) => (
          <li key={i} className={CORPO}>
            <Markdown texto={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BlocoAlerta({ bloco }: { bloco: Extract<Bloco, { tipo: 'alert' }> }) {
  return (
    <aside className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
      {bloco.titulo && <h4 className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-100">{bloco.titulo}</h4>}
      <div className="text-sm text-amber-900 dark:text-amber-100">
        <Markdown texto={bloco.texto} />
      </div>
    </aside>
  );
}

export function BlocoFormula({ bloco }: { bloco: Extract<Bloco, { tipo: 'formula' }> }) {
  return (
    <section>
      {bloco.titulo && <h4 className={`mb-1 ${TITULO}`}>{bloco.titulo}</h4>}
      <p className="overflow-x-auto rounded-lg bg-slate-100 px-3 py-2 font-mono text-base text-slate-900 dark:bg-slate-800 dark:text-slate-100">
        {bloco.texto}
      </p>
      {bloco.explicacao && (
        <div className={`mt-2 ${CORPO}`}>
          <Markdown texto={bloco.explicacao} />
        </div>
      )}
    </section>
  );
}

export function BlocoComparacao({ bloco }: { bloco: Extract<Bloco, { tipo: 'comparison' }> }) {
  return (
    <section>
      {bloco.titulo && <h4 className={`mb-2 ${TITULO}`}>{bloco.titulo}</h4>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="border border-slate-200 bg-slate-100 p-2 text-left dark:border-slate-700 dark:bg-slate-800">
                <span className="sr-only">Item</span>
              </th>
              {bloco.colunas.map((coluna, i) => (
                <th
                  key={i}
                  scope="col"
                  className="border border-slate-200 bg-slate-100 p-2 text-left font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {coluna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bloco.linhas.map((linha, i) => (
              <tr key={i}>
                <th scope="row" className="border border-slate-200 p-2 text-left font-semibold dark:border-slate-700">
                  {linha.rotulo}
                </th>
                {bloco.colunas.map((_, j) => (
                  <td key={j} className="border border-slate-200 p-2 align-top dark:border-slate-700">
                    {linha.valores[j] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
