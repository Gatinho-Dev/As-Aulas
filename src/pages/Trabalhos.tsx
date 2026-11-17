import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AutorConteudo from '../components/AutorConteudo';
import ProfessorResponsavel from '../components/ProfessorResponsavel';
import {
  formatDateTime,
  loadAssignments,
  loadProgressMap,
  saveProgress,
  statusOf,
  type AssignmentRow,
  type Progress,
  type ProgressStatus,
} from './assignmentUtils';

const COLUNAS: { status: ProgressStatus; label: string }[] = [
  { status: 'pendente', label: 'A fazer' },
  { status: 'em_andamento', label: 'Em andamento' },
  { status: 'concluida', label: 'Concluído' },
];

export default function Trabalhos() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [items, setItems] = useState<AssignmentRow[] | null>(null);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [visao, setVisao] = useState<'lista' | 'quadro'>('lista');
  const [disciplina, setDisciplina] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [trabalhos, mapa] = await Promise.all([loadAssignments('trabalho'), loadProgressMap()]);
      setItems(trabalhos);
      setProgress(mapa);
    } catch {
      setError('Não foi possível carregar os trabalhos. Verifique sua conexão e tente novamente.');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const disciplinas = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const i of items ?? []) if (i.subject_id && i.subjects) mapa.set(i.subject_id, i.subjects.name);
    return [...mapa.entries()];
  }, [items]);

  const filtrados = useMemo(
    () => (items ?? []).filter((i) => !disciplina || i.subject_id === disciplina),
    [items, disciplina],
  );

  async function mudar(item: AssignmentRow, status: ProgressStatus) {
    if (!userId) return;
    setPendingId(item.id);
    setError(null);
    const err = await saveProgress(item.id, userId, status);
    setPendingId(null);
    if (err) {
      setError('Não foi possível salvar sua alteração. Tente novamente.');
      return;
    }
    await load();
  }

  if (items === null) {
    return (
      <div className="space-y-3" role="status" aria-label="Carregando trabalhos">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  const statusDe = (item: AssignmentRow): ProgressStatus => progress[item.id]?.personal_status ?? 'pendente';

  return (
    <section aria-labelledby="titulo-trabalhos" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 id="titulo-trabalhos" className="text-2xl font-bold">
          Trabalhos
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">
            <span className="sr-only">Filtrar por disciplina</span>              <select
              value={disciplina}
              onChange={(e) => setDisciplina(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Todas as disciplinas</option>
              {disciplinas.map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700" role="group" aria-label="Visualização">
            {(['lista', 'quadro'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={visao === v}
                onClick={() => setVisao(v)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  visao === v ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200' : ''
                }`}
              >
                {v === 'lista' ? 'Lista' : 'Quadro'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="font-medium">Nenhum trabalho publicado para você ainda.</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Quando sua turma tiver trabalhos publicados, eles aparecerão aqui.
          </p>
        </div>
      ) : visao === 'lista' ? (
        <ul className="space-y-3">
          {filtrados.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"
            >
              <Cartao item={item} status={statusDe(item)} />
              <label className="shrink-0 text-sm">
                <span className="sr-only">Andamento de {item.title}</span>
                <select
                  value={statusDe(item)}
                  disabled={pendingId === item.id}
                  onChange={(e) => void mudar(item, e.target.value as ProgressStatus)}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:w-auto dark:border-slate-700 dark:bg-slate-900"
                >
                  {COLUNAS.map((c) => (
                    <option key={c.status} value={c.status}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUNAS.map((coluna) => {
            const cards = filtrados.filter((i) => statusDe(i) === coluna.status);
            return (
              <section key={coluna.status} aria-label={coluna.label} className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
                <h2 className="mb-3 flex items-center justify-between text-sm font-semibold">
                  {coluna.label}
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs dark:bg-slate-800">{cards.length}</span>
                </h2>
                <ul className="space-y-2">
                  {cards.map((item) => (
                    <li key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <Cartao item={item} status={statusDe(item)} />
                      <label className="mt-2 block text-xs">
                        <span className="sr-only">Mover {item.title}</span>
                        <select
                          value={statusDe(item)}
                          disabled={pendingId === item.id}
                          onChange={(e) => void mudar(item, e.target.value as ProgressStatus)}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
                        >
                          {COLUNAS.map((c) => (
                            <option key={c.status} value={c.status}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Cartao({ item, status }: { item: AssignmentRow; status: ProgressStatus }) {
  const estado = statusOf(item.due_at, status);
  const rotulo = estado === 'concluida' ? 'Concluído' : estado === 'atrasada' ? 'Atrasado' : 'No prazo';
  return (
    <div className="min-w-0">
      <Link to={`/trabalhos/${item.id}`} className="font-semibold text-indigo-800 hover:underline dark:text-indigo-300">
        {item.title}
      </Link>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        <span className="inline-block size-2.5 rounded-full align-middle" style={{ backgroundColor: item.subjects?.color }} aria-hidden="true" />{' '}
        {item.subjects?.name} · {item.classes?.name} · Prazo: {formatDateTime(item.due_at)}
      </p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</p>
      <ProfessorResponsavel nome={item.professor} className="mt-1" />
      <AutorConteudo autor={item.autor} className="mt-0.5" />
    </div>
  );
}
