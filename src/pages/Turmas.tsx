import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

export type Turma = {
  id: string;
  name: string;
  school_year: number;
  shift: string | null;
  description: string | null;
};

export const TURNO_LABEL: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  integral: 'Integral',
};

export function anoLabel(ano: number): string {
  return `${ano}º ano`;
}

export default function Turmas() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const [turmas, setTurmas] = useState<Turma[] | null>(null);
  const [principal, setPrincipal] = useState<string | null>(null);
  const [ano, setAno] = useState('');
  const [turno, setTurno] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const [turmasRes, prefRes] = await Promise.all([
        supabase
          .from('classes')
          .select('id, name, school_year, shift, description')
          .eq('active', true)
          .order('school_year', { ascending: true })
          .order('name', { ascending: true }),
        supabase.from('user_preferences').select('preferred_class_id').eq('user_id', userId).maybeSingle(),
      ]);
      if (turmasRes.error) {
        setError('Não foi possível carregar as turmas. Tente novamente.');
        setTurmas([]);
        return;
      }
      setTurmas((turmasRes.data ?? []) as Turma[]);
      setPrincipal((prefRes.data?.preferred_class_id as string | undefined) ?? null);
    })();
  }, [userId]);

  const anos = useMemo(() => [...new Set((turmas ?? []).map((t) => t.school_year))].sort((a, b) => a - b), [turmas]);

  const filtradas = useMemo(
    () =>
      (turmas ?? []).filter(
        (t) => (!ano || String(t.school_year) === ano) && (!turno || t.shift === turno),
      ),
    [turmas, ano, turno],
  );

  async function definirPrincipal(turmaId: string) {
    if (!userId) return;
    setSalvando(true);
    setMensagem(null);
    const { error: err } = await supabase
      .from('user_preferences')
      .upsert({ user_id: userId, preferred_class_id: turmaId }, { onConflict: 'user_id' });
    setSalvando(false);
    if (err) {
      setMensagem('Não foi possível definir a turma principal. Tente novamente.');
      return;
    }
    setPrincipal(turmaId);
    setMensagem('Turma principal atualizada.');
  }

  if (turmas === null) {
    return (
      <div className="space-y-3" role="status" aria-label="Carregando turmas">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  return (
    <section aria-labelledby="titulo-turmas" className="space-y-6">
      <div>
        <h1 id="titulo-turmas" className="text-2xl font-bold">
          Turmas
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Consulte as turmas às quais você tem acesso. Escolha uma turma principal para destacá-la.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}
      {mensagem && (
        <p role="status" className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
          {mensagem}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="sr-only">Filtrar por ano</span>
          <select value={ano} onChange={(e) => setAno(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <option value="">Todos os anos</option>
            {anos.map((a) => (
              <option key={a} value={String(a)}>
                {anoLabel(a)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="sr-only">Filtrar por turno</span>
          <select value={turno} onChange={(e) => setTurno(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <option value="">Todos os turnos</option>
            {Object.entries(TURNO_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {turmas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          {profile?.role === 'admin' ? (
            <>
              <p className="font-medium">Nenhuma turma foi cadastrada ainda.</p>
              <p className="mt-1 text-sm text-slate-500">Cadastre turmas na área de administração.</p>
            </>
          ) : (
            <>
              <p className="font-medium">Você ainda não está em nenhuma turma.</p>
              <p className="mt-1 text-sm text-slate-500">Escolha a sua turma para ver o conteúdo dela.</p>
              <Link
                to="/bem-vindo"
                className="mt-4 inline-block rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
              >
                Escolher minha turma
              </Link>
            </>
          )}
        </div>
      ) : filtradas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          Nenhuma turma corresponde aos filtros escolhidos.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtradas.map((t) => {
            const ehPrincipal = t.id === principal;
            return (
              <li key={t.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{t.name}</h2>
                    <p className="text-xs text-slate-500">
                      {anoLabel(t.school_year)}
                      {t.shift ? ` · ${TURNO_LABEL[t.shift] ?? t.shift}` : ''}
                    </p>
                  </div>
                  {ehPrincipal && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
                      Principal
                    </span>
                  )}
                </div>
                {t.description && <p className="text-sm text-slate-600 dark:text-slate-400">{t.description}</p>}
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link to={`/turmas/${t.id}`} className="rounded-lg bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800">
                    Abrir turma
                  </Link>
                  {!ehPrincipal && profile?.role !== 'admin' && (
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => void definirPrincipal(t.id)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      Definir como principal
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
