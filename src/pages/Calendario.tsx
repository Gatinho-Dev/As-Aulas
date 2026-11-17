import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { addDays, dayKey, TYPE_LABEL, TZ, type AssignmentType } from './assignmentUtils';
import { inputClass } from './Login';

type Visao = 'mes' | 'semana' | 'lista';

type Item = {
  key: string;
  titulo: string;
  iso: string;
  dia: string;
  tipo: AssignmentType | 'evento';
  rota: string | null;
  turmaId: string | null;
  turma: string;
  disciplinaId: string | null;
  disciplina: string | null;
};

type Linha = {
  id: string;
  type?: AssignmentType;
  title: string;
  due_at?: string;
  starts_at?: string;
  class_id: string | null;
  subject_id: string | null;
  classes: { name: string } | null;
  subjects: { name: string } | null;
};

const ROTA: Record<AssignmentType, string> = {
  licao_casa: '/licoes',
  trabalho: '/trabalhos',
  prova: '/provas',
};

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

function diaLongo(key: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString('pt-BR', {
    timeZone: TZ,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

/** Primeiro dia da semana (segunda) que contém a chave. */
function inicioDaSemana(key: string): string {
  const wd = new Date(`${key}T12:00:00Z`).getUTCDay();
  return addDays(key, -((wd + 6) % 7));
}

/** Desloca uma chave YYYY-MM-DD em meses, mantendo o dia 1. */
function mesVizinho(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
}

function nomeMes(key: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: TZ, month: 'long', year: 'numeric' });
}

export default function Calendario() {
  const hojeKey = dayKey(new Date());
  const [visao, setVisao] = useState<Visao>('mes');
  const [ancora, setAncora] = useState(hojeKey);
  const [turmaFiltro, setTurmaFiltro] = useState('');
  const [disciplinaFiltro, setDisciplinaFiltro] = useState('');
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const [a, e] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, type, title, due_at, class_id, subject_id, classes(name), subjects(name)')
          .eq('status', 'publicada')
          .order('due_at', { ascending: true }),
        supabase
          .from('events')
          .select('id, title, starts_at, class_id, subject_id, classes(name), subjects(name)')
          .order('starts_at', { ascending: true }),
      ]);
      if (!ativo) return;
      if (a.error || e.error) {
        setErro('Não foi possível carregar o calendário. Verifique sua conexão e tente novamente.');
        setItens([]);
        return;
      }
      const mapear = (l: Linha, tipo: Item['tipo'], iso: string): Item => ({
        key: `${tipo}-${l.id}`,
        titulo: l.title,
        iso,
        dia: dayKey(iso),
        tipo,
        rota: tipo === 'evento' ? null : `${ROTA[tipo]}/${l.id}`,
        turmaId: l.class_id,
        turma: l.classes?.name ?? 'Geral',
        disciplinaId: l.subject_id,
        disciplina: l.subjects?.name ?? null,
      });
      const lista = [
        ...((a.data ?? []) as unknown as Linha[]).map((l) => mapear(l, l.type!, l.due_at!)),
        ...((e.data ?? []) as unknown as Linha[]).map((l) => mapear(l, 'evento', l.starts_at!)),
      ].sort((x, y) => x.iso.localeCompare(y.iso));
      setErro(null);
      setItens(lista);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const turmas = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of itens ?? []) if (i.turmaId) m.set(i.turmaId, i.turma);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [itens]);

  const disciplinas = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of itens ?? []) if (i.disciplinaId && i.disciplina) m.set(i.disciplinaId, i.disciplina);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [itens]);

  const filtrados = useMemo(
    () =>
      (itens ?? []).filter(
        (i) =>
          (!turmaFiltro || i.turmaId === turmaFiltro) &&
          (!disciplinaFiltro || i.disciplinaId === disciplinaFiltro),
      ),
    [itens, turmaFiltro, disciplinaFiltro],
  );

  const porDia = useMemo(() => {
    const m: Record<string, Item[]> = {};
    for (const i of filtrados) (m[i.dia] ??= []).push(i);
    return m;
  }, [filtrados]);

  function navegar(direcao: -1 | 1) {
    if (visao === 'mes') setAncora((k) => mesVizinho(k, direcao));
    else if (visao === 'semana') setAncora((k) => addDays(k, 7 * direcao));
  }

  const tituloPeriodo =
    visao === 'mes'
      ? nomeMes(ancora)
      : visao === 'semana'
        ? `${diaLongo(inicioDaSemana(ancora))} a ${diaLongo(addDays(inicioDaSemana(ancora), 6))}`
        : 'Próximos eventos e prazos';

  const celulasMes = useMemo(() => {
    const primeiro = `${ancora.slice(0, 7)}-01`;
    const inicio = inicioDaSemana(primeiro);
    return Array.from({ length: 42 }, (_, n) => addDays(inicio, n));
  }, [ancora]);

  const diasSemana = useMemo(() => {
    const inicio = inicioDaSemana(ancora);
    return Array.from({ length: 7 }, (_, n) => addDays(inicio, n));
  }, [ancora]);

  const listaFutura = useMemo(
    () => filtrados.filter((i) => i.dia >= hojeKey),
    [filtrados, hojeKey],
  );

  const selectClass = inputClass + ' w-auto min-w-40';

  return (
    <section aria-labelledby="titulo-calendario" className="space-y-5">
      <div>
        <h1 id="titulo-calendario" className="text-2xl font-bold">
          Calendário
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Provas, trabalhos, lições e eventos nas datas corretas.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Modo de visualização" className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700">
          {(
            [
              ['mes', 'Mês'],
              ['semana', 'Semana'],
              ['lista', 'Lista'],
            ] as [Visao, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={visao === v}
              onClick={() => setVisao(v)}
              className={`px-3 py-1.5 text-sm font-medium first:rounded-l-lg last:rounded-r-lg ${
                visao === v
                  ? 'bg-indigo-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="cal-turma" className="mb-1 block text-sm font-medium">Turma</label>
          <select id="cal-turma" value={turmaFiltro} onChange={(e) => setTurmaFiltro(e.target.value)} className={selectClass}>
            <option value="">Todas</option>
            {turmas.map(([id, nome]) => (
              <option key={id} value={id}>{nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cal-disc" className="mb-1 block text-sm font-medium">Disciplina</label>
          <select id="cal-disc" value={disciplinaFiltro} onChange={(e) => setDisciplinaFiltro(e.target.value)} className={selectClass}>
            <option value="">Todas</option>
            {disciplinas.map(([id, nome]) => (
              <option key={id} value={id}>{nome}</option>
            ))}
          </select>
        </div>
      </div>

      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </p>
      )}

      {itens === null ? (
        <div role="status" aria-label="Carregando calendário" className="h-96 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      ) : (
        <>
          {visao !== 'lista' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <button type="button" onClick={() => navegar(-1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                  Anterior <span className="sr-only">{visao === 'mes' ? 'mês' : 'semana'}</span>
                </button>
                <button type="button" onClick={() => setAncora(hojeKey)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                  Hoje
                </button>
                <button type="button" onClick={() => navegar(1)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                  Próximo <span className="sr-only">{visao === 'mes' ? 'mês' : 'semana'}</span>
                </button>
              </div>
              <h2 className="text-lg font-semibold capitalize">{tituloPeriodo}</h2>
            </div>
          )}

          {visao === 'mes' && (
            <div className="overflow-x-auto">
              <div className="grid min-w-[42rem] grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="bg-slate-100 px-2 py-1 text-center text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {d}
                  </div>
                ))}
                {celulasMes.map((dia) => {
                  const doMes = dia.slice(0, 7) === ancora.slice(0, 7);
                  const lista = porDia[dia] ?? [];
                  return (
                    <div
                      key={dia}
                      className={`min-h-24 p-1.5 ${doMes ? 'bg-white dark:bg-slate-950' : 'bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-600'}`}
                    >
                      <p className={`mb-1 text-xs font-semibold ${dia === hojeKey ? 'inline-block rounded-full bg-indigo-700 px-1.5 text-white' : ''}`}>
                        <time dateTime={dia}>{Number(dia.slice(8))}</time>
                      </p>
                      <ul className="space-y-1">
                        {lista.slice(0, 3).map((i) => (
                          <li key={i.key}>
                            <EventoChip item={i} />
                          </li>
                        ))}
                        {lista.length > 3 && (
                          <li className="text-xs text-slate-600 dark:text-slate-400">+{lista.length - 3} item(ns)</li>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {visao === 'semana' && (
            <ol className="grid gap-3 md:grid-cols-7">
              {diasSemana.map((dia) => (
                <li key={dia} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="mb-2 text-sm font-semibold capitalize">
                    <time dateTime={dia}>{diaLongo(dia)}</time>
                  </h3>
                  {(porDia[dia] ?? []).length === 0 ? (
                    <p className="text-xs text-slate-500">Nada previsto.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(porDia[dia] ?? []).map((i) => (
                        <li key={i.key}>
                          <EventoChip item={i} comHora />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}

          {visao === 'lista' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{tituloPeriodo}</h2>
              {listaFutura.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">Nada previsto a partir de hoje.</p>
              ) : (
                Object.entries(
                  listaFutura.reduce<Record<string, Item[]>>((acc, i) => {
                    (acc[i.dia] ??= []).push(i);
                    return acc;
                  }, {}),
                ).map(([dia, lista]) => (
                  <section key={dia} aria-label={diaLongo(dia)}>
                    <h3 className="mb-2 text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">{diaLongo(dia)}</h3>
                    <ul className="space-y-2">
                      {lista.map((i) => (
                        <li key={i.key}>
                          <EventoChip item={i} comHora />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function EventoChip({ item, comHora = false }: { item: Item; comHora?: boolean }) {
  const rotulo = item.tipo === 'evento' ? 'Evento' : TYPE_LABEL[item.tipo];
  const texto = `${rotulo}: ${item.titulo}${comHora ? ` · ${hora(item.iso)}` : ''} (${item.turma})`;
  const classe =
    'block truncate rounded px-1.5 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-900 hover:underline dark:bg-indigo-950 dark:text-indigo-200';
  return item.rota ? (
    <Link to={item.rota} className={classe} title={texto}>
      {texto}
    </Link>
  ) : (
    <span className={classe} title={texto}>
      {texto}
    </span>
  );
}
