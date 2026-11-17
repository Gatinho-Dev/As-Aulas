import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AvatarAluno from '../components/AvatarAluno';
import AutorConteudo from '../components/AutorConteudo';
import type { AutorResumo } from '../lib/pessoa';
import { formatDateTime, TYPE_LABEL, type AssignmentType } from './assignmentUtils';
import { anoLabel, TURNO_LABEL, type Turma } from './Turmas';

type Atividade = {
  id: string;
  type: AssignmentType;
  title: string;
  due_at: string;
  subjects: { name: string; color: string } | null;
};

type Disciplina = {
  teacher_name: string | null;
  subjects: { name: string; color: string } | null;
};

type Aviso = {
  id: string;
  title: string;
  body: string;
  category: string;
  importance: string;
  is_global: boolean;
  published_at: string;
  autor: AutorResumo | null;
  announcement_targets: { class_id: string }[];
};

type Aba = 'visao' | 'licoes' | 'trabalhos' | 'provas' | 'avisos' | 'colegas';

type Colega = {
  id: string;
  display_name: string;
  bio: string | null;
  accent_color: string | null;
  avatar_path: string | null;
};

const ABAS: { id: Aba; label: string }[] = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'licoes', label: 'Lições de casa' },
  { id: 'trabalhos', label: 'Trabalhos' },
  { id: 'provas', label: 'Provas' },
  { id: 'avisos', label: 'Avisos' },
  { id: 'colegas', label: 'Colegas' },
];

const ROTA_ATIVIDADE: Record<AssignmentType, string> = {
  licao_casa: '/licoes',
  trabalho: '/trabalhos',
  prova: '/provas',
};

export default function TurmaDetalhe() {
  const { id = '' } = useParams();
  const [turma, setTurma] = useState<Turma | null | undefined>(undefined);
  const [atividades, setAtividades] = useState<Atividade[] | null>(null);
  const [disciplinas, setDisciplinas] = useState<Disciplina[] | null>(null);
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('visao');

  useEffect(() => {
    setTurma(undefined);
    setErro(null);
    void (async () => {
      const [turmaRes, ativRes, discRes, avisoRes] = await Promise.all([
        supabase.from('classes').select('id, name, school_year, shift, description').eq('id', id).maybeSingle(),
        supabase
          .from('assignments')
          .select('id, type, title, due_at, subjects(name, color)')
          .eq('class_id', id)
          .order('due_at', { ascending: true }),
        supabase.from('class_subjects').select('teacher_name, subjects(name, color)').eq('class_id', id),
        supabase
          .from('announcements')
          .select(
            'id, title, body, category, importance, is_global, published_at, autor:profiles!announcements_author_id_fkey(display_name, avatar_path, accent_color), announcement_targets(class_id)',
          )
          .eq('status', 'publicado')
          .order('published_at', { ascending: false }),
      ]);
      if (turmaRes.error || ativRes.error || discRes.error || avisoRes.error) {
        setErro('Não foi possível carregar a turma. Verifique sua conexão e tente novamente.');
      }
      setTurma((turmaRes.data as Turma | null) ?? null);
      setAtividades((ativRes.data ?? []) as unknown as Atividade[]);
      setDisciplinas((discRes.data ?? []) as unknown as Disciplina[]);
      setAvisos((avisoRes.data ?? []) as unknown as Aviso[]);
    })();
  }, [id]);

  const avisosDaTurma = useMemo(
    () => (avisos ?? []).filter((a) => a.is_global || a.announcement_targets.some((t) => t.class_id === id)),
    [avisos, id],
  );

  const proximas = useMemo(() => {
    const agora = Date.now();
    return (atividades ?? []).filter((a) => new Date(a.due_at).getTime() >= agora).slice(0, 5);
  }, [atividades]);

  if (turma === undefined) {
    return (
      <div className="space-y-3" role="status" aria-label="Carregando turma">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (turma === null) {
    return (
      <div className="space-y-3">
        <p className="font-medium">Turma não encontrada ou sem acesso.</p>
        <Link to="/turmas" className="text-sm font-medium text-indigo-800 hover:underline dark:text-indigo-300">
          Voltar para Turmas
        </Link>
      </div>
    );
  }

  return (
    <section aria-labelledby="titulo-turma" className="space-y-6">
      <div>
        <Link to="/turmas" className="text-sm font-medium text-indigo-800 hover:underline dark:text-indigo-300">
          ← Turmas
        </Link>
        <h1 id="titulo-turma" className="mt-1 text-2xl font-bold">
          {turma.name}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {anoLabel(turma.school_year)}
          {turma.shift ? ` · ${TURNO_LABEL[turma.shift] ?? turma.shift}` : ''}
        </p>
        {turma.description && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{turma.description}</p>}
      </div>

      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </p>
      )}

      <div role="tablist" aria-label="Seções da turma" className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            type="button"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              aba === a.id
                ? 'border-indigo-700 text-indigo-900 dark:border-indigo-300 dark:text-indigo-200'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'visao' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h2 className="font-semibold">Próximas atividades</h2>
            {atividades === null ? (
              <p className="text-sm text-slate-500">Carregando…</p>
            ) : proximas.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">Nenhuma atividade com prazo futuro.</p>
            ) : (
              <ul className="space-y-2">
                {proximas.map((a) => (
                  <ItemAtividade key={a.id} a={a} />
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-3">
            <h2 className="font-semibold">Disciplinas</h2>
            {disciplinas === null ? (
              <p className="text-sm text-slate-500">Carregando…</p>
            ) : disciplinas.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">Nenhuma disciplina cadastrada para esta turma.</p>
            ) : (
              <ul className="space-y-2">
                {disciplinas.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                    <span className="size-3 rounded-full" style={{ background: d.subjects?.color ?? '#737E93' }} aria-hidden="true" />
                    <span className="font-medium">{d.subjects?.name}</span>
                    {d.teacher_name && <span className="text-slate-500">· {d.teacher_name}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {(aba === 'licoes' || aba === 'trabalhos' || aba === 'provas') && (
        <ListaPorTipo
          tipo={aba === 'licoes' ? 'licao_casa' : aba === 'trabalhos' ? 'trabalho' : 'prova'}
          atividades={atividades}
        />
      )}

      {aba === 'colegas' && <ListaColegas classId={id} />}

      {aba === 'avisos' && (
        <div className="space-y-3">
          {avisos === null ? (
            <p className="text-sm text-slate-500">Carregando…</p>
          ) : avisosDaTurma.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
              Ainda não há avisos publicados para esta turma.
            </p>
          ) : (
            <ul className="space-y-3">
              {avisosDaTurma.map((a) => (
                <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs text-slate-500">{formatDateTime(a.published_at)}</p>
                  <h3 className="mt-1 font-semibold">{a.title}</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{a.body}</p>
                  <AutorConteudo autor={a.autor} className="mt-2" />
                </li>
              ))}
            </ul>
          )}
          <Link to="/avisos" className="inline-block text-sm font-medium text-indigo-800 hover:underline dark:text-indigo-300">
            Ver todos os avisos
          </Link>
        </div>
      )}
    </section>
  );
}

function ListaColegas({ classId }: { classId: string }) {
  const [colegas, setColegas] = useState<Colega[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setColegas(null);
    setErro(null);
    void (async () => {
      const { data, error } = await supabase.rpc('listar_colegas', { p_class_id: classId });
      if (error) {
        setErro('Não foi possível carregar os colegas.');
        setColegas([]);
        return;
      }
      setColegas((data ?? []) as Colega[]);
    })();
  }, [classId]);

  if (colegas === null) return <p className="text-sm text-slate-500">Carregando…</p>;
  if (erro) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
        {erro}
      </p>
    );
  }
  if (colegas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
        Nenhum outro aluno ativo nesta turma ainda.
      </p>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {colegas.map((c) => (
        <li key={c.id}>
          <Link
            to={`/perfil/${c.id}`}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900"
          >
            <AvatarAluno nome={c.display_name} caminho={c.avatar_path} cor={c.accent_color} />
            <span className="min-w-0">
              <span className="block break-words font-semibold">{c.display_name}</span>
              {c.bio && (
                <span className="mt-1 line-clamp-2 block text-sm text-slate-600 dark:text-slate-400">{c.bio}</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ListaPorTipo({ tipo, atividades }: { tipo: AssignmentType; atividades: Atividade[] | null }) {
  if (atividades === null) return <p className="text-sm text-slate-500">Carregando…</p>;
  const lista = atividades.filter((a) => a.type === tipo);
  if (lista.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
        Nenhum item de {TYPE_LABEL[tipo].toLowerCase()} publicado para esta turma.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {lista.map((a) => (
        <ItemAtividade key={a.id} a={a} />
      ))}
    </ul>
  );
}

function ItemAtividade({ a }: { a: Atividade }) {
  return (
    <li>
      <Link
        to={`${ROTA_ATIVIDADE[a.type]}/${a.id}`}
        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{a.title}</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="size-2 rounded-full" style={{ background: a.subjects?.color ?? '#737E93' }} aria-hidden="true" />
            {a.subjects?.name ?? 'Sem disciplina'} · {TYPE_LABEL[a.type]}
          </span>
        </span>
        <span className="shrink-0 text-xs text-slate-600 dark:text-slate-400">Prazo {formatDateTime(a.due_at)}</span>
      </Link>
    </li>
  );
}
