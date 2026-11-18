import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTurmaPrincipal } from '../lib/useTurmaPrincipal';
import AutorConteudo from '../components/AutorConteudo';
import type { AutorResumo } from '../lib/pessoa';
import { formatDateTime } from './assignmentUtils';

type Aviso = {
  id: string;
  title: string;
  body: string;
  category: string;
  importance: 'normal' | 'importante' | 'urgente';
  is_global: boolean;
  link_url: string | null;
  published_at: string;
  autor: AutorResumo | null;
  announcement_targets: { class_id: string; classes: { name: string } | null }[];
};

const CATEGORIAS: Record<string, string> = {
  geral: 'Geral',
  tarefa: 'Tarefa',
  prova: 'Prova',
  trabalho: 'Trabalho',
  evento: 'Evento',
  alteracao_horario: 'Alteração de horário',
  comunicado_importante: 'Comunicado importante',
};

export default function Avisos() {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [turma, setTurma] = useState('');
  const { principalId, principal } = useTurmaPrincipal();

  useEffect(() => {
    void (async () => {
      const { data, error: err } = await supabase
        .from('announcements')
        .select(
          'id, title, body, category, importance, is_global, link_url, published_at, autor:profiles!announcements_author_id_fkey(display_name, avatar_path, accent_color), announcement_targets(class_id, classes(name))',
        )
        .eq('status', 'publicado')
        .order('published_at', { ascending: false });
      if (err) {
        setError('Não foi possível carregar os avisos. Verifique sua conexão e tente novamente.');
        setAvisos([]);
        return;
      }
      setAvisos((data ?? []) as unknown as Aviso[]);
    })();
  }, []);

  useEffect(() => {
    if (principalId && !turma) setTurma(principalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principalId]);

  const turmas = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const a of avisos ?? [])
      for (const t of a.announcement_targets) if (t.classes) mapa.set(t.class_id, t.classes.name);
    return [...mapa.entries()];
  }, [avisos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return (avisos ?? []).filter((a) => {
      if (categoria && a.category !== categoria) return false;
      if (turma && !a.announcement_targets.some((t) => t.class_id === turma)) return false;
      if (termo && !`${a.title} ${a.body}`.toLocaleLowerCase('pt-BR').includes(termo)) return false;
      return true;
    });
  }, [avisos, busca, categoria, turma]);

  if (avisos === null) {
    return (
      <div className="space-y-3" role="status" aria-label="Carregando avisos">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <section aria-labelledby="titulo-avisos" className="space-y-6">
      <h1 id="titulo-avisos" className="text-2xl font-bold">
        Mural de avisos
      </h1>
      {principal && (
        <p className="text-sm text-slate-600 dark:text-slate-400" role="status">
          Mostrando a turma principal <strong>{principal.name}</strong>. Para ver outra, troque o filtro ou{' '}
          <Link to="/turmas" className="font-medium text-indigo-800 hover:underline dark:text-indigo-300">
            troque a turma principal
          </Link>
          .
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <label className="min-w-[12rem] flex-1 text-sm">
          <span className="sr-only">Pesquisar avisos</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar avisos"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="text-sm">
          <span className="sr-only">Filtrar por categoria</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <option value="">Todas as categorias</option>
            {Object.entries(CATEGORIAS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
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
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="font-medium">
            {avisos.length === 0 ? 'Ainda não há avisos publicados.' : 'Nenhum aviso encontrado com esses filtros.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtrados.map((a) => {
            const destaque = a.importance !== 'normal';
            return (
              <li
                key={a.id}
                className={`rounded-xl border bg-white p-4 dark:bg-slate-900 ${
                  a.importance === 'urgente'
                    ? 'border-red-300 dark:border-red-800'
                    : a.importance === 'importante'
                      ? 'border-amber-300 dark:border-amber-800'
                      : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium dark:bg-slate-800">
                    {CATEGORIAS[a.category] ?? a.category}
                  </span>
                  {destaque && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      {a.importance === 'urgente' ? 'Urgente' : 'Importante'}
                    </span>
                  )}
                  <span className="text-slate-500">{formatDateTime(a.published_at)}</span>
                </div>
                <h2 className="mt-2 font-semibold">{a.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{a.body}</p>
                <AutorConteudo autor={a.autor} className="mt-2" />
                <p className="mt-2 text-xs text-slate-500">
                  {a.is_global
                    ? 'Para toda a escola'
                    : `Turmas: ${a.announcement_targets.map((t) => t.classes?.name).filter(Boolean).join(', ')}`}
                </p>
                {a.link_url && (
                  <a href={a.link_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-indigo-800 hover:underline dark:text-indigo-300">
                    Abrir link relacionado
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
