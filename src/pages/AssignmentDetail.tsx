import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import AutorConteudo from '../components/AutorConteudo';
import ProfessorResponsavel from '../components/ProfessorResponsavel';
import type { AutorResumo } from '../lib/pessoa';
import { carregarProfessores, formatDateTime, professorDe, statusOf, type Progress } from './assignmentUtils';
import { labelStatus } from './Assignments';

type Detail = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  reference_materials: string | null;
  links: { label?: string; url: string }[];
  due_at: string;
  priority: string;
  classes: { name: string } | null;
  subjects: { name: string; color: string } | null;
  autor: AutorResumo | null;
  class_id: string;
  subject_id: string;
  professor: string | null;
};

export default function AssignmentDetail() {
  const { id } = useParams();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [item, setItem] = useState<Detail | null | undefined>(undefined);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    const [a, p, professores] = await Promise.all([
      supabase
        .from('assignments')
        .select(
          'id, title, description, instructions, reference_materials, links, due_at, priority, class_id, subject_id, classes(name), subjects(name, color), autor:profiles!assignments_created_by_fkey(display_name, avatar_path, accent_color)',
        )
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('assignment_progress')
        .select('assignment_id, personal_status, completed_at')
        .eq('assignment_id', id)
        .maybeSingle(),
      carregarProfessores(),
    ]);
    if (a.error || p.error) {
      setError('Não foi possível carregar esta lição. Tente novamente.');
      setItem(null);
      return;
    }
    const encontrado = (a.data as unknown as Detail | null) ?? null;
    setItem(
      encontrado
        ? { ...encontrado, professor: professorDe(professores, encontrado.class_id, encontrado.subject_id) }
        : null,
    );
    setProgress((p.data as Progress | null) ?? null);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle() {
    if (!item || !userId) return;
    const concluida = progress?.personal_status === 'concluida';
    setBusy(true);
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
    setBusy(false);
    if (err) {
      setError('Não foi possível salvar sua alteração. Tente novamente.');
      return;
    }
    await load();
  }

  if (item === undefined) {
    return <div className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" role="status" />;
  }

  if (item === null) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
        <p className="font-medium">{error ?? 'Esta lição não existe ou você não tem acesso a ela.'}</p>
        <Link to="/" className="mt-3 inline-block text-indigo-700 hover:underline dark:text-indigo-300">
          Voltar para a visão geral
        </Link>
      </div>
    );
  }

  const status = statusOf(item.due_at, progress?.personal_status);

  return (
    <article className="space-y-6">
      <Link to="/" className="text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300">
        ← Visão geral
      </Link>
      <header>
        <h1 className="text-2xl font-bold">{item.title}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {item.subjects?.name} · {item.classes?.name} · Entrega: {formatDateTime(item.due_at)} · {labelStatus(status)}
        </p>
        <ProfessorResponsavel nome={item.professor} prefixo="Professor(a) responsável" className="mt-2" />
        <AutorConteudo autor={item.autor} className="mt-0.5" />
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        className="rounded-lg bg-indigo-700 px-4 py-2.5 font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
      >
        {progress?.personal_status === 'concluida' ? 'Desfazer conclusão' : 'Marcar como concluída'}
      </button>

      <Section titulo="Descrição" texto={item.description} />
      <Section titulo="Instruções" texto={item.instructions} />
      <Section titulo="Materiais de referência" texto={item.reference_materials} />

      {item.links?.length > 0 && (
        <section>
          <h2 className="font-semibold">Links</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {item.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline dark:text-indigo-300">
                  {l.label || l.url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function Section({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null;
  return (
    <section>
      <h2 className="font-semibold">{titulo}</h2>
      <p className="mt-2 whitespace-pre-line text-slate-700 dark:text-slate-300">{texto}</p>
    </section>
  );
}
