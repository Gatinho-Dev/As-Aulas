import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTurmaPrincipal } from '../lib/useTurmaPrincipal';
import { inputClass } from './Login';
import { anoLabel } from './Turmas';

type Vinculo = {
  class_id: string;
  teacher_name: string | null;
  subjects: { id: string; name: string; color: string; description: string | null } | null;
  classes: { name: string; school_year: number } | null;
};

export default function Disciplinas() {
  const [vinculos, setVinculos] = useState<Vinculo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [turmaFiltro, setTurmaFiltro] = useState('');
  const { principalId, principal } = useTurmaPrincipal();

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('class_subjects')
        .select('class_id, teacher_name, subjects(id, name, color, description), classes(name, school_year)');
      if (error) {
        setErro('Não foi possível carregar as disciplinas. Verifique sua conexão e tente novamente.');
        setVinculos([]);
        return;
      }
      setVinculos((data ?? []) as unknown as Vinculo[]);
    })();
  }, []);

  useEffect(() => {
    if (principalId && !turmaFiltro) setTurmaFiltro(principalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principalId]);

  const turmas = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const v of vinculos ?? []) {
      if (v.classes) mapa.set(v.class_id, `${v.classes.name} (${anoLabel(v.classes.school_year)})`);
    }
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [vinculos]);

  const visiveis = useMemo(
    () => (vinculos ?? []).filter((v) => !turmaFiltro || v.class_id === turmaFiltro),
    [vinculos, turmaFiltro],
  );

  return (
    <section aria-labelledby="titulo-disciplinas" className="space-y-6">
      <div>
        <h1 id="titulo-disciplinas" className="text-2xl font-bold">
          Disciplinas
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Matérias de cada turma e seus professores.</p>
        {principal && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400" role="status">
            Turma principal: <strong>{principal.name}</strong>.{' '}
            <Link to="/turmas" className="font-medium text-indigo-800 hover:underline dark:text-indigo-300">
              Trocar
            </Link>
          </p>
        )}
      </div>

      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </p>
      )}

      <div className="max-w-xs">
        <label htmlFor="filtro-turma-disc" className="mb-1 block text-sm font-medium">
          Filtrar por turma
        </label>
        <select
          id="filtro-turma-disc"
          value={turmaFiltro}
          onChange={(e) => setTurmaFiltro(e.target.value)}
          className={inputClass}
        >
          <option value="">Todas as minhas turmas</option>
          {turmas.map(([id, nome]) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
        </select>
      </div>

      {vinculos === null ? (
        <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="Carregando disciplinas">
          <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      ) : visiveis.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          Nenhuma disciplina encontrada.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visiveis.map((v) => (
            <li
              key={`${v.class_id}-${v.subjects?.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ background: v.subjects?.color ?? '#737E93' }} aria-hidden="true" />
                <h2 className="font-semibold">{v.subjects?.name}</h2>
              </div>
              {v.teacher_name && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Professor(a): {v.teacher_name}</p>}
              {v.subjects?.description && <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{v.subjects.description}</p>}
              <p className="mt-2 text-xs text-slate-500">
                Turma:{' '}
                <Link to={`/turmas/${v.class_id}`} className="font-medium text-indigo-800 hover:underline dark:text-indigo-300">
                  {v.classes?.name ?? 'Ver turma'}
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
