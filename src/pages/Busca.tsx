import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate, TYPE_LABEL, type AssignmentType } from './assignmentUtils';

const ROTA_TIPO: Record<AssignmentType, string> = {
  licao_casa: '/licoes',
  trabalho: '/trabalhos',
  prova: '/provas',
};

type Resultados = {
  atividades: { id: string; type: AssignmentType; title: string; due_at: string; classes: { name: string } | null }[];
  avisos: { id: string; title: string; published_at: string | null }[];
  turmas: { id: string; name: string }[];
  disciplinas: { id: string; name: string }[];
};

const VAZIO: Resultados = { atividades: [], avisos: [], turmas: [], disciplinas: [] };

/** Remove caracteres que têm significado no filtro do PostgREST (ilike). */
function limpar(termo: string): string {
  return termo.replace(/[%_,()*\\]/g, ' ').trim();
}

export default function Busca() {
  const [params] = useSearchParams();
  const termo = limpar(params.get('q') ?? '');
  const [resultados, setResultados] = useState<Resultados>(VAZIO);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (termo.length < 2) {
      setResultados(VAZIO);
      setErro(null);
      return;
    }
    let ativo = true;
    setCarregando(true);
    const padrao = `%${termo}%`;
    Promise.all([
      supabase
        .from('assignments')
        .select('id, type, title, due_at, classes(name)')
        .eq('status', 'publicada')
        .ilike('title', padrao)
        .order('due_at', { ascending: true })
        .limit(20),
      supabase
        .from('announcements')
        .select('id, title, published_at')
        .eq('status', 'publicado')
        .ilike('title', padrao)
        .order('published_at', { ascending: false })
        .limit(20),
      supabase.from('classes').select('id, name').eq('active', true).ilike('name', padrao).order('name').limit(20),
      supabase.from('subjects').select('id, name').eq('active', true).ilike('name', padrao).order('name').limit(20),
    ]).then(([a, av, t, d]) => {
      if (!ativo) return;
      const falha = a.error || av.error || t.error || d.error;
      if (falha) {
        setErro('Não foi possível concluir a busca. Tente novamente.');
        setResultados(VAZIO);
      } else {
        setErro(null);
        setResultados({
          atividades: (a.data ?? []) as unknown as Resultados['atividades'],
          avisos: (av.data ?? []) as Resultados['avisos'],
          turmas: (t.data ?? []) as Resultados['turmas'],
          disciplinas: (d.data ?? []) as Resultados['disciplinas'],
        });
      }
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [termo]);

  const total =
    resultados.atividades.length + resultados.avisos.length + resultados.turmas.length + resultados.disciplinas.length;

  return (
    <section aria-labelledby="titulo-busca" className="space-y-6">
      <div>
        <h1 id="titulo-busca" className="text-2xl font-bold">
          Busca
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {termo.length < 2
            ? 'Digite pelo menos 2 letras no campo de busca do topo.'
            : carregando
              ? 'Buscando…'
              : `${total} resultado(s) para "${termo}".`}
        </p>
      </div>

      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </p>
      )}

      {termo.length >= 2 && !carregando && total === 0 && !erro && (
        <p className="text-sm text-slate-600 dark:text-slate-400">Nada encontrado. Tente outras palavras.</p>
      )}

      {resultados.atividades.length > 0 && (
        <Grupo titulo="Atividades">
          {resultados.atividades.map((a) => (
            <li key={a.id}>
              <Link to={`${ROTA_TIPO[a.type]}/${a.id}`} className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-sm font-medium">{a.title}</span>
                <span className="block text-xs text-slate-600 dark:text-slate-400">
                  {TYPE_LABEL[a.type]} · {a.classes?.name ?? 'Geral'} · entrega {formatDate(a.due_at)}
                </span>
              </Link>
            </li>
          ))}
        </Grupo>
      )}

      {resultados.avisos.length > 0 && (
        <Grupo titulo="Avisos">
          {resultados.avisos.map((av) => (
            <li key={av.id}>
              <Link to="/avisos" className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-sm font-medium">{av.title}</span>
                {av.published_at && (
                  <span className="block text-xs text-slate-600 dark:text-slate-400">publicado em {formatDate(av.published_at)}</span>
                )}
              </Link>
            </li>
          ))}
        </Grupo>
      )}

      {resultados.turmas.length > 0 && (
        <Grupo titulo="Turmas">
          {resultados.turmas.map((t) => (
            <li key={t.id}>
              <Link to={`/turmas/${t.id}`} className="block rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900">
                {t.name}
              </Link>
            </li>
          ))}
        </Grupo>
      )}

      {resultados.disciplinas.length > 0 && (
        <Grupo titulo="Disciplinas">
          {resultados.disciplinas.map((d) => (
            <li key={d.id}>
              <Link to="/disciplinas" className="block rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900">
                {d.name}
              </Link>
            </li>
          ))}
        </Grupo>
      )}
    </section>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo}>
      <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{titulo}</h2>
      <ul className="grid gap-2 sm:grid-cols-2">{children}</ul>
    </section>
  );
}
