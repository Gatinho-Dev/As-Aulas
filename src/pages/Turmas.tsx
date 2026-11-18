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

export const ANOS_FUND2 = [6, 7, 8, 9];
const SALAS = ['A', 'B', 'C', 'D'];

export function letraDaTurma(nome: string): string {
  const m = nome.match(/\b([A-D])\b\s*$/i);
  if (m) return m[1].toUpperCase();
  const limpo = nome.trim();
  return limpo.slice(-1).toUpperCase();
}

type TurmaSignup = { id: string; name: string; school_year: number; shift: string | null };

export default function Turmas() {
  const { profile } = useAuth();
  const ehAdmin = profile?.role === 'admin';
  const { minhasTurmas, principalId, principal, carregando, erro, definirPrincipal, entrarEAtivar } =
    useTurmaPrincipal();

  const [todasTurmas, setTodasTurmas] = useState<Turma[] | null>(ehAdmin ? null : []);
  const [anoSel, setAnoSel] = useState(() => { try { return localStorage.getItem('turma-ano-sel') ?? ''; } catch { return ''; } });
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

  // Ano já escolhido fica azulzinho e é lembrado. Se nunca escolheu, usa o ano da principal.
  useEffect(() => {
    if (!anoSel && principal) setAnoSel(String(principal.school_year));
  }, [principal, anoSel]);
  useEffect(() => {
    try {
      if (anoSel) localStorage.setItem('turma-ano-sel', anoSel);
    } catch { /* ignora */ }
  }, [anoSel]);

  const salasDoAno = useMemo(() => {
    if (!anoSel) return [];
    return SALAS.map((letra) => {
      const minha = (minhasTurmas ?? []).find(
        (t) => String(t.school_year) === anoSel && letraDaTurma(t.name) === letra,
      );
      const opcao = opcoes.find(
        (t) => String(t.school_year) === anoSel && letraDaTurma(t.name) === letra,
      );
      return {
        letra,
        minha: minha ?? null,
        opcao: opcao ?? null,
        nome: minha?.name ?? opcao?.name ?? `${anoSel}º ano ${letra}`,
        id: minha?.class_id ?? opcao?.id ?? '',
      };
    });
  }, [anoSel, minhasTurmas, opcoes]);

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

  async function entrarNaSala(id: string, nome: string) {
    setErroAcao(null);
    setMensagem(null);
    setSalvandoId(id);
    const err = await entrarEAtivar(id);
    setSalvandoId(null);
    if (err) {
      setErroAcao(err);
      return;
    }
    setMensagem(
      `Você entrou em ${nome} e ela virou sua turma principal. Todo o site agora mostra o conteúdo dela.`,
    );
  }

  if (ehAdmin) {
    const salasAdmin = SALAS.map((letra) => {
      const turma = (todasTurmas ?? []).find(
        (t) => String(t.school_year) === anoSel && letraDaTurma(t.name) === letra,
      );
      return { letra, turma: turma ?? null };
    });
    return (
      <section aria-labelledby="titulo-turmas" className="space-y-6">
        <div>
          <h1 id="titulo-turmas" className="text-2xl font-bold">
            Turmas
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Primeiro escolha o ano, depois a sala.
          </p>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">1. Escolha o ano</h2>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Escolha o ano">
            {ANOS_FUND2.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAnoSel(String(a))}
                aria-pressed={anoSel === String(a)}
                className={`rounded-xl border px-2 py-4 text-center font-bold ${anoSel === String(a) ? 'border-indigo-600 bg-indigo-700 text-white' : 'border-slate-300 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'}`}
              >
                <span className="block text-xl">{a}º</span>
                <span className="block text-xs font-normal opacity-80">{anoLabel(a)}</span>
              </button>
            ))}
          </div>
        </div>
        {todasTurmas === null ? (
          <div className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ) : !anoSel ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
            Toque em 6º, 7º, 8º ou 9º para ver as salas A, B, C e D.
          </p>
        ) : (
          <div>
            <h2 className="mb-2 font-semibold">2. Escolha a sala do {anoLabel(Number(anoSel))}</h2>
            {mensagem && (
              <div role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                <p>{mensagem}</p>
                <p className="mt-2 flex flex-wrap gap-2">
                  <Link to="/licoes" className="rounded-lg bg-emerald-700 px-3 py-1.5 font-medium text-white hover:bg-emerald-800">Ver lições dessa turma</Link>
                  <Link to="/" className="rounded-lg border border-emerald-600 px-3 py-1.5 font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900">Ir para o Início</Link>
                </p>
              </div>
            )}
            {erroAcao && (<p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{erroAcao}</p>)}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {salasAdmin.map(({ letra, turma }) => {
                const ehPrincipal = turma && turma.id === principalId;
                const busy = turma ? salvandoId === turma.id : false;
                return (
                <li key={letra} className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center ${ehPrincipal ? 'border-indigo-600 bg-indigo-700 text-white shadow-lg' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                  <span className="text-3xl font-extrabold">{letra}</span>
                  <span className={`text-xs ${ehPrincipal ? 'text-indigo-100' : 'text-slate-500'}`}>{turma ? turma.name : 'Sem turma'}</span>
                  {ehPrincipal ? (
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-indigo-800">✓ Definida — o site já mostra esta sala</span>
                  ) : turma ? (
                    <>
                      <button type="button" disabled={busy} onClick={() => void entrarNaSala(turma.id, turma.name)} className="mt-1 w-full rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-60">Definir turma</button>
                      <Link to={`/turmas/${turma.id}`} className="text-xs font-medium text-slate-500 hover:underline">abrir detalhes</Link>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">Indisponível</span>
                  )}
                </li>
                );
              })}
            </ul>
            <button type="button" onClick={() => setAnoSel('')} className="mt-3 text-sm font-medium text-slate-500 hover:underline">← Voltar e escolher outro ano</button>
          </div>
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

  return (
    <section aria-labelledby="titulo-turmas" className="space-y-6">
      <div>
        <h1 id="titulo-turmas" className="text-2xl font-bold">
          Turmas
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Primeiro escolha o ano, depois a sala. A sala principal muda o site todo.
        </p>
      </div>

      {principal && (
        <div
          className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950"
          role="status"
        >
          <p className="font-medium text-indigo-900 dark:text-indigo-100">
            Turma principal: {principal.name}
          </p>
          <p className="mt-1 text-sm text-indigo-800 dark:text-indigo-200">
            O site inteiro mostra essa turma. Para trocar, escolha outro ano e outra sala abaixo.
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
        <div role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <p>{mensagem}</p>
          <p className="mt-2 flex flex-wrap gap-2">
            <Link to="/licoes" className="rounded-lg bg-emerald-700 px-3 py-1.5 font-medium text-white hover:bg-emerald-800">Ver lições dessa turma</Link>
            <Link to="/" className="rounded-lg border border-emerald-600 px-3 py-1.5 font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900">Ir para o Início</Link>
          </p>
        </div>
      )}

      {/* PASSO 1 — só os 4 anos. O ano já escolhido fica azulzinho. */}
      <div>
        <h2 className="mb-2 font-semibold">1. Escolha o ano</h2>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Escolha o ano">
          {ANOS_FUND2.map((a) => {
            const selecionado = anoSel === String(a);
            const ehMeuAno = principal ? String(principal.school_year) === String(a) : false;
            return (
              <button
                key={a}
                type="button"
                onClick={() => setAnoSel(String(a))}
                aria-pressed={selecionado}
                title={ehMeuAno ? 'Seu ano — toque para ver sua sala' : anoLabel(a)}
                className={`rounded-xl border px-2 py-4 text-center font-bold ${
                  selecionado
                    ? 'border-indigo-600 bg-indigo-700 text-white shadow'
                    : 'border-slate-300 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                }`}
              >
                <span className="block text-xl">{a}º</span>
                <span className="block text-xs font-normal opacity-80">{anoLabel(a)}</span>
                {ehMeuAno && (
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${selecionado ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'}`}>
                    ● seu ano
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {principal && anoSel === String(principal.school_year) && (
          <p className="mt-2 text-sm text-indigo-700 dark:text-indigo-300">Esse ano azulzinho é o seu — abaixo está a sua sala marcada como Principal.</p>
        )}
      </div>

      {/* PASSO 2 — só aparece depois do ano */}
      {!anoSel ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
          Toque em 6º, 7º, 8º ou 9º para ver as salas A, B, C e D.
        </p>
      ) : (
        <div>
          <h2 className="mb-2 font-semibold">2. Escolha a sala do {anoLabel(Number(anoSel))}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {salasDoAno.map((s) => {
              const ehPrincipal = s.minha && s.minha.class_id === principalId;
              const estouDentro = !!s.minha;
              const busy = salvandoId === s.id;
              return (
                <li
                  key={s.letra}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center ${
                    ehPrincipal
                      ? 'border-indigo-600 bg-indigo-700 text-white shadow-lg ring-2 ring-indigo-300 dark:border-indigo-400 dark:bg-indigo-800'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <span className="text-3xl font-extrabold">{s.letra}</span>
                  <span className="text-xs text-slate-500">{s.nome}</span>
                  {ehPrincipal ? (
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-indigo-800">
                      ● Sua sala — Principal
                    </span>
                  ) : estouDentro ? (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium dark:bg-slate-700">
                      Minha turma
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                      Toque para entrar
                    </span>
                  )}
                  {ehPrincipal ? (
                    <span className="mt-1 w-full rounded-lg bg-white/20 px-3 py-1.5 text-center text-sm font-semibold text-white">
                      ✓ Definida — o site já mostra esta sala
                    </span>
                  ) : estouDentro && s.minha ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void trocarPrincipal(s.minha!.class_id, s.nome)}
                      className="mt-1 w-full rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-60"
                    >
                      {busy ? 'Definindo…' : 'Definir turma'}
                    </button>
                  ) : s.opcao ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void entrarNaSala(s.opcao!.id, s.nome)}
                      className="mt-1 w-full rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-60"
                    >
                      {busy ? 'Definindo…' : 'Definir turma'}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Indisponível</span>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => setAnoSel('')}
            className="mt-3 text-sm font-medium text-slate-500 hover:underline"
          >
            ← Voltar e escolher outro ano
          </button>
        </div>
      )}
    </section>
  );
}
