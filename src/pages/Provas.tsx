import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTurmaPrincipal } from '../lib/useTurmaPrincipal';
import AutorConteudo from '../components/AutorConteudo';
import ProfessorResponsavel from '../components/ProfessorResponsavel';
import {
  addDays,
  dayKey,
  diffDays,
  formatDateTime,
  loadAssignments,
  type AssignmentRow,
} from './assignmentUtils';

type Periodo = 'todas' | 'semana' | 'mes' | 'futuras' | 'historico';

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'futuras', label: 'Próximas' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mês' },
  { value: 'historico', label: 'Histórico' },
  { value: 'todas', label: 'Todas' },
];

export default function Provas() {
  const [items, setItems] = useState<AssignmentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turma, setTurma] = useState('');
  const { principalId, principal } = useTurmaPrincipal();
  const [disciplina, setDisciplina] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('futuras');

  useEffect(() => {
    if (principalId && !turma) setTurma(principalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principalId]);

  useEffect(() => {
    loadAssignments('prova')
      .then(setItems)
      .catch(() => {
        setError('Não foi possível carregar as provas. Verifique sua conexão e tente novamente.');
        setItems([]);
      });
  }, []);

  const turmas = useMemo(() => uniq(items ?? [], (i) => i.class_id, (i) => i.classes?.name), [items]);
  const disciplinas = useMemo(() => uniq(items ?? [], (i) => i.subject_id, (i) => i.subjects?.name), [items]);

  const filtradas = useMemo(() => {
    const hoje = dayKey(new Date());
    const semanaIni = semanaInicio(hoje);
    const semanaFim = addDays(semanaIni, 6);
    const mesPrefixo = hoje.slice(0, 7);
    const agora = Date.now();

    return (items ?? [])
      .filter((i) => !turma || i.class_id === turma)
      .filter((i) => !disciplina || i.subject_id === disciplina)
      .filter((i) => {
        const dia = dayKey(i.due_at);
        const futura = new Date(i.due_at).getTime() >= agora;
        switch (periodo) {
          case 'futuras':
            return futura;
          case 'semana':
            return dia >= semanaIni && dia <= semanaFim;
          case 'mes':
            return dia.slice(0, 7) === mesPrefixo;
          case 'historico':
            return !futura;
          default:
            return true;
        }
      })
      .sort((a, b) =>
        periodo === 'historico' ? b.due_at.localeCompare(a.due_at) : a.due_at.localeCompare(b.due_at),
      );
  }, [items, turma, disciplina, periodo]);

  const proxima = useMemo(() => {
    const agora = Date.now();
    return (items ?? [])
      .filter((i) => new Date(i.due_at).getTime() >= agora)
      .sort((a, b) => a.due_at.localeCompare(b.due_at))[0];
  }, [items]);

  if (items === null) {
    return (
      <div className="space-y-3" role="status" aria-label="Carregando provas">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <section aria-labelledby="titulo-provas" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 id="titulo-provas" className="text-2xl font-bold">
          Provas e avaliações
        </h1>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        {proxima ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400">Próxima prova</p>
            <p className="mt-1 text-lg font-semibold">{proxima.title}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {proxima.subjects?.name} · {proxima.classes?.name} · {formatDateTime(proxima.due_at)}
            </p>
            <p className="mt-3 text-3xl font-bold text-indigo-800 dark:text-indigo-300">
              {contagem(diffDays(dayKey(new Date()), dayKey(proxima.due_at)))}
            </p>
          </>
        ) : (
          <p className="font-medium">Nenhuma prova próxima.</p>
        )}
      </div>

      {principal && (
        <p className="text-sm text-slate-600 dark:text-slate-400" role="status">
          Mostrando a turma principal <strong>{principal.name}</strong>. Para ver outra, troque o filtro ou{' '}
          <Link to="/turmas" className="font-medium text-indigo-800 hover:underline dark:text-indigo-300">
            troque a turma principal
          </Link>
          .
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="sr-only">Filtrar por turma</span>
          <select value={turma} onChange={(e) => setTurma(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <option value="">Todas as minhas turmas</option>
            {turmas.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="sr-only">Filtrar por disciplina</span>
          <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <option value="">Todas as disciplinas</option>
            {disciplinas.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="sr-only">Filtrar por período</span>
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            {PERIODOS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="font-medium">Nenhuma prova neste período.</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">As avaliações publicadas para sua turma aparecerão aqui.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtradas.map((p) => (
            <li key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <Link to={`/provas/${p.id}`} className="font-semibold text-indigo-800 hover:underline dark:text-indigo-300">
                {p.title}
              </Link>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                <span className="inline-block size-2.5 rounded-full align-middle" style={{ backgroundColor: p.subjects?.color }} aria-hidden="true" />{' '}
                {p.subjects?.name} · {p.classes?.name} · {formatDateTime(p.due_at)}
              </p>
              <ProfessorResponsavel nome={p.professor} className="mt-2" />
              <AutorConteudo autor={p.autor} className="mt-0.5" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function semanaInicio(hoje: string): string {
  const dia = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  return addDays(hoje, -((dia + 6) % 7));
}

function contagem(dias: number): string {
  if (dias === 0) return 'É hoje!';
  if (dias === 1) return 'Falta 1 dia';
  return `Faltam ${dias} dias`;
}

function uniq(
  items: AssignmentRow[],
  id: (i: AssignmentRow) => string | undefined,
  nome: (i: AssignmentRow) => string | undefined,
): [string, string][] {
  const mapa = new Map<string, string>();
  for (const i of items) {
    const k = id(i);
    const n = nome(i);
    if (k && n) mapa.set(k, n);
  }
  return [...mapa.entries()];
}
