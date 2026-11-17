import { useState } from 'react';
import { DIAS, GRADE, MATERIAS, TURMA_HORARIO, type Aula, type Linha } from '../data/horario6D';
import { TZ } from './assignmentUtils';

const NOMES_INGLES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/** Índice do dia da semana local (0 = segunda). Fim de semana cai na segunda. */
function diaAtual(): number {
  const nome = new Date().toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long' });
  const i = NOMES_INGLES.indexOf(nome);
  return i === -1 ? 0 : i;
}

function Cartao({ aula }: { aula: Aula }) {
  const materia = MATERIAS[aula.materia];
  return (
    <div className={`flex h-full min-h-[4.5rem] flex-col justify-center rounded-2xl px-3 py-2 shadow-sm ${materia.cor}`}>
      <span className="text-sm font-bold leading-tight">{aula.materia}</span>
      <span className="text-xs leading-snug opacity-80">{aula.professor}</span>
    </div>
  );
}

function CartaoIntervalo() {
  return (
    <div className="flex h-full min-h-[4.5rem] items-center justify-center rounded-2xl bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
      Intervalo
    </div>
  );
}

export default function Horario() {
  const [dia, setDia] = useState(diaAtual);
  const hoje = diaAtual();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-indigo-900 dark:text-white">
          Grade horária | Turma {TURMA_HORARIO.replace('ano ', '')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Segunda a sexta-feira · 25 aulas por semana</p>
      </header>

      {/* Celular: um dia por vez */}
      <div className="md:hidden" data-tutorial="horario">
        <div role="tablist" aria-label="Dias da semana" className="mb-4 grid grid-cols-5 gap-1">
          {DIAS.map((nome, i) => (
            <button
              key={nome}
              type="button"
              role="tab"
              aria-selected={dia === i}
              onClick={() => setDia(i)}
              className={`rounded-xl px-1 py-2 text-xs font-semibold ${
                dia === i
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700'
              }`}
            >
              {nome.split('-')[0].slice(0, 3)}
              {i === hoje && <span className="block text-[10px] font-normal opacity-80">hoje</span>}
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {GRADE.map((linha, idx) => (
            <LinhaMobile key={idx} linha={linha} dia={dia} />
          ))}
        </ul>
      </div>

      {/* Computador: os cinco dias lado a lado */}
      <div className="hidden overflow-x-auto md:block" data-tutorial="horario">
        <div className="grid min-w-[52rem] grid-cols-[7rem_repeat(5,minmax(0,1fr))] gap-2">
          <div />
          {DIAS.map((nome, i) => (
            <div
              key={nome}
              className={`rounded-xl px-2 py-2 text-center text-sm font-semibold ${
                i === hoje ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {nome}
            </div>
          ))}
          {GRADE.map((linha, idx) => (
            <LinhaDesktop key={idx} linha={linha} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LinhaMobile({ linha, dia }: { linha: Linha; dia: number }) {
  if (linha.tipo === 'intervalo') {
    return (
      <li className="grid grid-cols-[5.5rem_1fr] items-stretch gap-3">
        <span className="pt-3 text-xs font-medium text-slate-500">{linha.horario}</span>
        <CartaoIntervalo />
      </li>
    );
  }
  return (
    <li className="grid grid-cols-[5.5rem_1fr] items-stretch gap-3">
      <span className="pt-3 text-xs font-medium text-slate-500">
        {linha.numero}ª aula
        <span className="block text-[11px] font-normal">{linha.horario}</span>
      </span>
      <Cartao aula={linha.dias[dia]} />
    </li>
  );
}

function LinhaDesktop({ linha }: { linha: Linha }) {
  if (linha.tipo === 'intervalo') {
    return (
      <>
        <div className="flex items-center text-xs font-medium text-slate-500">{linha.horario}</div>
        <div className="col-span-5">
          <CartaoIntervalo />
        </div>
      </>
    );
  }
  return (
    <>
      <div className="flex flex-col justify-center text-xs font-medium text-slate-500">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{linha.numero}ª aula</span>
        {linha.horario}
      </div>
      {linha.dias.map((aula, i) => (
        <Cartao key={i} aula={aula} />
      ))}
    </>
  );
}
