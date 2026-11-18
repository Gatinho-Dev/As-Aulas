import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { useTurmaPrincipal } from '../lib/useTurmaPrincipal';

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

type TurmaSignup = { id: string; name: string; school_year: number; shift: string | null };

export default function Turmas() {
  const { profile } = useAuth();
  const ehAdmin = profile?.role === 'admin';
  const { minhasTurmas, principalId, principal, carregando, erro, definirPrincipal, entrarEAtivar } =
    useTurmaPrincipal();

  const [todasTurmas, setTodasTurmas] = useState<Turma[] | null>(ehAdmin ? null : []);
  const [ano, setAno] = useState('');
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  // Admin continua vendo todas as turmas para gerenciar.
  useEffect(() => {
    if (!ehAdmin) return;
    let ativo = true;
    void supabase
      .from('classes')
      .select('id, name, school_year, shift, description')
      .eq('active', true)
      .order('school_year', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (!ativo) return;
        if (!error) setTodasTurmas((data ?? []) as Turma[]);
      });
    return () => {
      ativo = false;
    };
  }, [ehAdmin]);

  // Aluno: turmas disponíveis para entrar (fora das que já estou).
  const [opcoes, setOpcoes] = useState<TurmaSignup[]>([]);
  const [anoNovo, setAnoNovo] = useState('');
  const [turmaNova, setTurmaNova] = useState('');

  useEffect(() => {
    if (ehAdmin || !minhasTurmas) return;
    let ativo = true;
    void supabase.rpc('list_signup_classes').then(({ data, error }) => {
      if (!ativo || error) return;
      const jaEstou = new Set(minhasTurmas.map((t) => t.class_id));
      setOpcoes(((data ?? []) as TurmaSignup[]).filter((t) => !jaEstou.has(t.id)));
    });
    return () => {
      ativo = false;
    };
  }, [ehAdmin, minhasTurmas]);

  const anosOpcoes = useMemo(
    () => [...new Set(opcoes.map((t) => t.school_year))].sort((a, b) => a - b),
    [opcoes],
  );
  const opcoesDoAno = useMemo(
    () => opcoes.filter((t) => String(t.school_year) === anoNovo),
    [opcoes, anoNovo],
  );

  async function trocarPrincipal(turmaId: string, nome: string) {
    setErroAcao(null);
    setMensagem(null);
    setSalvandoId(turmaId);
    const err = await definirPrincipal(turmaId);
    setSalvandoId(null);
    if (err) {
      setErroAcao(err);
      return;
    }
    setMensagem(
      `Turma principal trocada para ${nome}. Todo o site agora mostra o conteúdo dela: lições, provas, trabalhos, avisos, calendário e horário.`,
    );
  }

  async function entrarOutra(e: React.FormEvent) {
    e.preventDefault();
    setErroAcao(null);
    setMensagem(null);
    if (!turmaNova) {
      setErroAcao('Escolha o ano e a sala para entrar.');
      return;
    }
    setSalvandoId('nova');
    const err = await entrarEAtivar(turmaNova);
    setSalvandoId(null);
    if (err) {
      setErroAcao(err);
      return;
    }
    const nome = opcoes.find((t) => t.id === turmaNova)?.name ?? 'a nova turma';
    setMensagem(
      `Você entrou em ${nome} e ela virou sua turma principal. Todo o site agora mostra o conteúdo dela.`,
    );
    setTurmaNova('');
  }

  if (ehAdmin) {
    return (
      <section aria-labelledby="titulo-turmas" className="space-y-6">
        <div>
          <h1 id="titulo-turmas" className="text-2xl font-bold">
            Turmas
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Todas as turmas ativas da escola.
          </p>
        </div>
        {todasTurmas === null ? (
          <div className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {(todasTurmas ?? []).map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <h2 className="font-semibold">{t.name}</h2>
                  <p className="text-xs text-slate-500">
                    {anoLabel(t.school_year)}
                    {t.shift ? ` · ${TURNO_LABEL[t.shift] ?? t.shift}` : ''}
                  </p>
                </div>
                <Link
                  to={`/turmas/${t.id}`}
                  className="mt-auto w-fit rounded-lg bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800"
                >
                  Abrir turma
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  if (carregando || minhasTurmas === null) {
    return (
      <div className="space-y-3" role="status" aria-label="Carregando turmas">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  const filtradas = minhasTurmas.filter((t) => !ano || String(t.school_year) === ano);
  const anos = [...new Set(minhasTurmas.map((t) => t.school_year))].sort((a, b) => a - b);

  return (
    <section aria-labelledby="titulo-turmas" className="space-y-6">
      <div>
        <h1 id="titulo-turmas" className="text-2xl font-bold">
          Turmas
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Escolha a <strong>turma principal</strong>. Todo o site muda para ela: lições, provas,
          trabalhos, avisos, calendário e horário.
        </p>
      </div>

      {principal && (
        <div
          className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950"
          role="status"
        >
          <p className="font-medium text-indigo-900 dark:text-indigo-100">
            Turma principal: {principal.name} ({anoLabel(principal.school_year)})
          </p>
          <p className="mt-1 text-sm text-indigo-800 dark:text-indigo-200">
            O site inteiro está mostrando o conteúdo dessa turma. Para trocar, toque em “Usar como
            principal” em outra turma abaixo.
          </p>
        </div>
      )}

      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </p>
      )}
      {erroAcao && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erroAcao}
        </p>
      )}
      {mensagem && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {mensagem}
        </p>
      )}

      {minhasTurmas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="font-medium">Você ainda não está em nenhuma turma.</p>
          <p className="mt-1 text-sm text-slate-500">Escolha a sua turma para ver o conteúdo dela.</p>
          <Link
            to="/bem-vindo"
            className="mt-4 inline-block rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
          >
            Escolher minha turma
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              <span className="sr-only">Filtrar por ano</span>
              <select
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">Minhas turmas: todos os anos</option>
                {anos.map((a) => (
                  <option key={a} value={String(a)}>
                    {anoLabel(a)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <h2 className="mb-2 font-semibold">Minhas turmas</h2>
            {filtradas.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
                Nenhuma das suas turmas corresponde ao filtro.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {filtradas.map((t) => {
                  const ehPrincipal = t.class_id === principalId;
                  return (
                    <li
                      key={t.class_id}
                      className={`flex flex-col gap-3 rounded-xl border bg-white p-4 dark:bg-slate-900 ${
                        ehPrincipal
                          ? 'border-indigo-400 ring-1 ring-indigo-300 dark:border-indigo-700'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{t.name}</h3>
                          <p className="text-xs text-slate-500">
                            {anoLabel(t.school_year)}
                            {t.shift ? ` · ${TURNO_LABEL[t.shift] ?? t.shift}` : ''}
                          </p>
                        </div>
                        {ehPrincipal && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
                            Principal — o site mostra esta
                          </span>
                        )}
                      </div>
                      <div className="mt-auto flex flex-wrap gap-2">
                        <Link
                          to={`/turmas/${t.class_id}`}
                          className="rounded-lg bg-indigo-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-800"
                        >
                          Abrir turma
                        </Link>
                        {!ehPrincipal && (
                          <button
                            type="button"
                            disabled={salvandoId === t.class_id}
                            onClick={() => void trocarPrincipal(t.class_id, t.name)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
                          >
                            {salvandoId === t.class_id ? 'Trocando…' : 'Usar como principal'}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {minhasTurmas.length > 0 && (
        <form
          onSubmit={entrarOutra}
          aria-label="Entrar em outra turma"
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="font-semibold">Entrar em outra turma</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Entrou numa turma nova? Escolha aqui. Ela vira sua principal e o site todo muda para ela.
          </p>
          {opcoes.length === 0 ? (
            <p className="text-sm text-slate-500">Você já está em todas as turmas disponíveis.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Ano
                <select
                  value={anoNovo}
                  onChange={(e) => {
                    setAnoNovo(e.target.value);
                    setTurmaNova('');
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">Selecione o ano</option>
                  {anosOpcoes.map((a) => (
                    <option key={a} value={String(a)}>
                      {anoLabel(a)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Sala
                <select
                  value={turmaNova}
                  disabled={!anoNovo}
                  onChange={(e) => setTurmaNova(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">{anoNovo ? 'Selecione a sala' : 'Escolha o ano primeiro'}</option>
                  {opcoesDoAno.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {opcoes.length > 0 && (
            <button
              type="submit"
              disabled={salvandoId === 'nova'}
              className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
            >
              {salvandoId === 'nova' ? 'Entrando…' : 'Entrar e usar como principal'}
            </button>
          )}
        </form>
      )}
    </section>
  );
}
