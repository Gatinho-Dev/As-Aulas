import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useTurmaPrincipal } from '../lib/useTurmaPrincipal';
import AutorConteudo from '../components/AutorConteudo';
import ProfessorResponsavel from '../components/ProfessorResponsavel';
import {
  carregarProfessores,
  formatDateTime,
  professorDe,
  statusOf,
  type AssignmentRow,
  type Progress,
} from './assignmentUtils';

export default function Assignments() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [items, setItems] = useState<AssignmentRow[] | null>(null);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { principalId } = useTurmaPrincipal();

  const load = useCallback(async () => {
    setError(null);
    const [a, p, professores] = await Promise.all([
      supabase
        .from('assignments')
        .select(
          'id, title, due_at, priority, class_id, subject_id, classes(name), subjects(name, color), autor:profiles!assignments_created_by_fkey(display_name, avatar_path, accent_color)',
        )
        .eq('type', 'licao_casa')
        .eq('status', 'publicada')
        .order('due_at', { ascending: true }),
      supabase.from('assignment_progress').select('assignment_id, personal_status, completed_at'),
      carregarProfessores(),
    ]);
    if (a.error || p.error) {
      setError('Não foi possível carregar as lições. Verifique sua conexão e tente novamente.');
      setItems([]);
      return;
    }
    setItems(
      ((a.data ?? []) as unknown as AssignmentRow[]).map((linha) => ({
        ...linha,
        professor: professorDe(professores, linha.class_id, linha.subject_id),
      })),
    );
    const map: Record<string, Progress> = {};
    for (const row of (p.data ?? []) as Progress[]) map[row.assignment_id] = row;
    setProgress(map);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(item: AssignmentRow) {
    if (!userId) return;
    const concluida = progress[item.id]?.personal_status === 'concluida';
    setPendingId(item.id);
    setError(null);
    const { error: err } = await supabase.from('assignment_progress').upsert(
      {
        assignment_id: item.id,
        user_id: userId,
        personal_status: concluida ? 'pendente' : 'concluida',
        completed_at: concluida ? null : new Date().toISOString(),
      },
      { onConflict: 'assignment_id,user_id' },
    );
    setPendingId(null);
    if (err) {
      setError('Não foi possível salvar sua alteração. Tente novamente.');
      return;
    }
    await load();
  }

  if (items === null) {
    return (
      <div className="space-y-3" role="status" aria-label="Carregando lições">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <section aria-labelledby="titulo-licoes">
      <h1 id="titulo-licoes" className="text-2xl font-bold">Lições de casa</h1>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {(principalId ? items.filter((i) => !i.class_id || i.class_id === principalId) : items).length === 0 && !error ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="font-medium">Nenhuma lição de casa publicada para você ainda.</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Quando sua turma tiver lições publicadas, elas aparecerão aqui.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {(principalId ? items.filter((i) => !i.class_id || i.class_id === principalId) : items).map((item) => {
            const status = statusOf(item.due_at, progress[item.id]?.personal_status);
            const concluida = status === 'concluida';
            return (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <Link to={`/licoes/${item.id}`} className="font-semibold text-indigo-800 hover:underline dark:text-indigo-300">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    <span className="inline-block size-2.5 rounded-full align-middle" style={{ backgroundColor: item.subjects?.color }} aria-hidden="true" />{' '}
                    {item.subjects?.name} · {item.classes?.name} · Entrega: {formatDateTime(item.due_at)}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{labelStatus(status)}</p>
                  <ProfessorResponsavel nome={item.professor} className="mt-1" />
                  <AutorConteudo autor={item.autor} className="mt-0.5" />
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                  <Link
                    to={`/licoes/${item.id}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-3 py-3 text-[15px] font-medium hover:bg-slate-100 sm:min-h-11 sm:py-2 sm:text-sm dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    Detalhes
                  </Link>
                  <button
                    type="button"
                    onClick={() => void toggle(item)}
                    disabled={pendingId === item.id}
                    className="min-h-12 rounded-xl bg-indigo-700 px-3 py-3 text-[15px] font-semibold text-white hover:bg-indigo-800 active:scale-[0.99] disabled:opacity-60 sm:min-h-11 sm:py-2 sm:text-sm"
                  >
                    {pendingId === item.id ? 'Salvando…' : concluida ? 'Desfazer' : 'Concluir'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function labelStatus(status: 'pendente' | 'concluida' | 'atrasada'): string {
  return status === 'concluida' ? 'Concluída' : status === 'atrasada' ? 'Atrasada' : 'Pendente';
}
