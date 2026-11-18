import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen, Check, GraduationCap, Hourglass } from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { Logo } from './Layout';
import { ANOS_FUND2, letraDaTurma } from './Turmas';

type TurmaOpcao = { id: string; name: string; school_year: number; shift: string | null };

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-base text-slate-900 shadow-sm backdrop-blur transition focus-visible:outline-2 focus-visible:outline-indigo-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100';

function validarEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

export default function Professores() {
  const { session, profile, loading, signInTeacher, signUpTeacher, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState<'entrar' | 'criar'>(() =>
    new URLSearchParams(window.location.search).get('modo') === 'criar' ? 'criar' : 'entrar',
  );
  const [turmas, setTurmas] = useState<TurmaOpcao[]>([]);
  const [nome, setNome] = useState('');
  const [materia, setMateria] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [anos, setAnos] = useState<number[]>([]);
  const [salas, setSalas] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [verificandoSol, setVerificandoSol] = useState(true);

  useEffect(() => {
    let ativo = true;
    supabase.rpc('list_signup_classes').then(({ data }) => {
      if (ativo) setTurmas(((data ?? []) as TurmaOpcao[]).filter((t) => ANOS_FUND2.includes(t.school_year)));
    });
    return () => {
      ativo = false;
    };
  }, []);

  const turmasPorAno = useMemo(() => {
    const mapa = new Map<number, TurmaOpcao[]>();
    for (const t of turmas) {
      const lista = mapa.get(t.school_year) ?? [];
      lista.push(t);
      mapa.set(t.school_year, lista);
    }
    return mapa;
  }, [turmas]);

  // Sala = combinação ano+letra; só mostra salas dos anos escolhidos.
  const salasDisponiveis = useMemo(() => {
    const out: { key: string; ano: number; letra: string; turmaId: string; nome: string }[] = [];
    for (const ano of anos) {
      for (const t of turmasPorAno.get(ano) ?? []) {
        const letra = letraDaTurma(t.name);
        out.push({ key: `${ano}${letra}`, ano, letra, turmaId: t.id, nome: t.name });
      }
    }
    out.sort((a, b) => a.ano - b.ano || a.letra.localeCompare(b.letra));
    return out;
  }, [anos, turmasPorAno]);

  useEffect(() => {
    if (!session || !profile || profile.role !== 'student') {
      setVerificandoSol(false);
      return;
    }
    let ativo = true;
    supabase.from('teacher_requests').select('status').eq('user_id', session.user.id).maybeSingle().then(({ data }) => {
      if (!ativo) return;
      if (data?.status) navigate('/professor', { replace: true });
      else setVerificandoSol(false);
    });
    return () => {
      ativo = false;
    };
  }, [session, profile, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-3 text-slate-500" role="status">
        <ThinkingOrb state="connecting" size={32} />
        Carregando…
      </div>
    );
  }

  // Professor aprovado vai direto ao painel.
  if (session && profile?.role === 'teacher') return <Navigate to="/professor" replace />;
  // Quem tem solicitação de professor é levado ao painel ver o status (aguardando/aprovado).
  if (session && profile && profile.role === 'student' && verificandoSol) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-3 text-slate-500" role="status">
        <ThinkingOrb state="connecting" size={32} />
        Carregando…
      </div>
    );
  }

  function alternarAno(ano: number) {
    setAnos((atual) => {
      const tem = atual.includes(ano);
      const prox = tem ? atual.filter((a) => a !== ano) : [...atual, ano].sort();
      // Remove salas de anos desmarcados
      setSalas((s) => s.filter((key) => prox.some((a) => key.startsWith(String(a)))));
      return prox;
    });
  }

  function alternarSala(key: string) {
    setSalas((atual) => (atual.includes(key) ? atual.filter((k) => k !== key) : [...atual, key]));
  }

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!validarEmail(email)) {
      setErro('Informe um e-mail válido.');
      return;
    }
    if (!senha) {
      setErro('Informe sua senha.');
      return;
    }
    setOcupado(true);
    const falha = await signInTeacher(email, senha);
    if (falha) {
      setOcupado(false);
      setErro(falha);
      return;
    }
    // O login de professor é só para professores (ou pedido em análise): aluno comum usa o login normal.
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id ?? null;
    if (uid) {
      const [{ data: perfil }, { data: sol }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', uid).maybeSingle(),
        supabase.from('teacher_requests').select('status').eq('user_id', uid).maybeSingle(),
      ]);
      const papel = (perfil as { role?: string } | null)?.role;
      const estado = (sol as { status?: string } | null)?.status;
      if (papel === 'student' && estado !== 'pendente' && estado !== 'aprovado') {
        await supabase.auth.signOut();
        setOcupado(false);
        setErro('Esta conta é de aluno. Use o login normal com seu nick.');
        return;
      }
    }
    setOcupado(false);
    await refreshProfile();
    navigate('/professor', { replace: true });
  }

  async function criar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (nome.trim().length < 3) {
      setErro('Informe seu nome completo.');
      return;
    }
    if (materia.trim().length < 2) {
      setErro('Informe a matéria que você ensina.');
      return;
    }
    if (!validarEmail(email)) {
      setErro('Informe um e-mail válido.');
      return;
    }
    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (anos.length === 0) {
      setErro('Escolha pelo menos um ano (6º ao 9º).');
      return;
    }
    if (salas.length === 0) {
      setErro('Escolha pelo menos uma sala.');
      return;
    }
    setOcupado(true);
    try {
      const { error, userId } = await signUpTeacher(nome, email, senha);
      if (error) {
        setErro(error);
        setOcupado(false);
        return;
      }
      // Garante sessão para gravar a solicitação (quando a confirmação de e-mail está desligada, já vem logado).
      let uid = userId;
      if (!uid) {
        const { data } = await supabase.auth.getSession();
        uid = data.session?.user.id ?? null;
      }
      if (!uid) {
        const falha = await signInTeacher(email, senha);
        if (falha) {
          setErro('Conta criada. Confirme seu e-mail e entre para concluir a solicitação.');
          setOcupado(false);
          return;
        }
        const { data } = await supabase.auth.getSession();
        uid = data.session?.user.id ?? null;
      }
      if (!uid) {
        setErro('Conta criada, mas não foi possível concluir a solicitação. Entre com seu e-mail e senha.');
        setOcupado(false);
        return;
      }
      const classIds = salas
        .map((key) => salasDisponiveis.find((s) => s.key === key)?.turmaId)
        .filter((v): v is string => !!v);
      const { error: erroSol } = await supabase.from('teacher_requests').insert({
        user_id: uid,
        full_name: nome.trim(),
        subject: materia.trim(),
        email_contact: email.trim(),
        years: anos,
        class_ids: classIds,
      });
      if (erroSol) {
        setErro('Conta criada, mas não foi possível enviar a solicitação. Entre e tente de novo.');
        setOcupado(false);
        return;
      }
      // Marca o perfil como concluído para não cair no onboarding de aluno.
      await supabase.from('profiles').update({ profile_completed_at: new Date().toISOString() }).eq('id', uid);
      // Vai direto ao painel, que mostra a tela de "aguardando aprovação".
      navigate('/professor', { replace: true });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-indigo-100 via-indigo-50 to-white px-4 py-8 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur hover:bg-white dark:bg-slate-900/70 dark:text-slate-200"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Início
          </Link>
          <Logo />
        </div>

        <div className="mt-6 overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 px-6 py-8 text-white sm:px-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
              <GraduationCap className="size-4" aria-hidden />
              Área dos professores
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Feita para publicar em segundos.</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-indigo-50">
              Entre com seu e-mail e senha ou peça acesso informando seu nome, sua matéria e as salas em que dá aula.
              A direção aprova e você já lança conteúdo para as suas turmas.
            </p>
            <div className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
              {[
                { icone: BookOpen, texto: 'Lições, trabalhos e provas' },
                { icone: BadgeCheck, texto: 'Avisos por turma' },
                { icone: Hourglass, texto: 'Aprovação da direção' },
              ].map((c) => (
                <div key={c.texto} className="flex items-center gap-2 rounded-2xl bg-white/12 px-3 py-2.5 backdrop-blur">
                  <c.icone className="size-5 shrink-0" aria-hidden />
                  <span className="font-medium">{c.texto}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <div role="tablist" aria-label="Entrar ou pedir acesso" className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
              {(['entrar', 'criar'] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  type="button"
                  aria-selected={modo === m}
                  onClick={() => {
                    setModo(m);
                    setErro(null);
                  }}
                  className={`min-h-11 rounded-xl text-sm font-bold transition ${
                    modo === m
                      ? 'bg-white text-indigo-900 shadow dark:bg-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  {m === 'entrar' ? 'Entrar' : 'Pedir acesso'}
                </button>
              ))}
            </div>

            {modo === 'entrar' ? (
              <form onSubmit={entrar} className="mt-6 space-y-4" autoComplete="on" noValidate={false}>
                <div>
                  <label htmlFor="prof-email" className="mb-1 block text-sm font-semibold">
                    E-mail
                  </label>
                  <input
                    id="prof-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@escola.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="prof-senha" className="mb-1 block text-sm font-semibold">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="prof-senha"
                      name="password"
                      type={mostrarSenha ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Sua senha"
                      className={`${inputClass} pr-20`}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      className="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-indigo-700 dark:text-indigo-300"
                    >
                      {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>
                {erro && (
                  <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                    {erro}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={ocupado}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 disabled:opacity-60"
                >
                  {ocupado ? 'Entrando…' : 'Entrar na área do professor'}
                  <ArrowRight className="size-4" aria-hidden />
                </button>
                <p className="text-center text-sm text-slate-500">
                  Ainda não tem acesso?{' '}
                  <button type="button" onClick={() => setModo('criar')} className="font-bold text-indigo-700 hover:underline dark:text-indigo-300">
                    Pedir acesso
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={criar} className="mt-6 space-y-5" autoComplete="on">
                <div>
                  <label htmlFor="prof-nome" className="mb-1 block text-sm font-semibold">
                    Nome completo <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="prof-nome"
                    name="name"
                    autoComplete="name"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Maria Silva Santos"
                    maxLength={120}
                    className={inputClass}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="prof-materia" className="mb-1 block text-sm font-semibold">
                      Matéria <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="prof-materia"
                      name="subject"
                      autoComplete="off"
                      value={materia}
                      onChange={(e) => setMateria(e.target.value)}
                      placeholder="Ex.: Matemática"
                      maxLength={80}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="prof-email-novo" className="mb-1 block text-sm font-semibold">
                      E-mail <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="prof-email-novo"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@escola.com"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="prof-senha-nova" className="mb-1 block text-sm font-semibold">
                    Criar senha <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="prof-senha-nova"
                      name="new-password"
                      type={mostrarSenha ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className={`${inputClass} pr-20`}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      className="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-indigo-700 dark:text-indigo-300"
                    >
                      {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">O celular pode perguntar se deseja salvar essa senha.</p>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-semibold">1 · Anos em que dá aula <span className="text-red-600">*</span></legend>
                  <div className="grid grid-cols-4 gap-2">
                    {ANOS_FUND2.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => alternarAno(a)}
                        aria-pressed={anos.includes(a)}
                        className={`flex min-h-12 items-center justify-center gap-1 rounded-2xl text-lg font-bold transition ${
                          anos.includes(a)
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        {anos.includes(a) && <Check className="size-4" aria-hidden />}
                        {a}º
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-2 text-sm font-semibold">2 · Salas em que dá aula <span className="text-red-600">*</span></legend>
                  {anos.length === 0 ? (
                    <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800">
                      Escolha os anos acima para ver as salas.
                    </p>
                  ) : salasDisponiveis.length === 0 ? (
                    <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800">
                      Nenhuma sala encontrada para esses anos.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {salasDisponiveis.map((s) => {
                        const ativo = salas.includes(s.key);
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => alternarSala(s.key)}
                            aria-pressed={ativo}
                            className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold transition ${
                              ativo
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                            }`}
                          >
                            {ativo && <Check className="size-4" aria-hidden />}
                            {s.ano}º {s.letra}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-slate-500">Depois de aprovado, você publica escolhendo uma dessas salas no painel.</p>
                </fieldset>

                {erro && (
                  <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                    {erro}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={ocupado}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 disabled:opacity-60"
                >
                  {ocupado ? 'Enviando…' : 'Enviar solicitação de acesso'}
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </form>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">O acesso é liberado pela direção após a aprovação.</p>
      </div>
    </main>
  );
}
