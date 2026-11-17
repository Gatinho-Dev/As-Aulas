import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { NICK_REGEX, useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { Logo } from './Layout';

type SignupClass = {
  id: string;
  name: string;
  school_year: number;
  shift: string | null;
};

const shiftLabels: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  integral: 'Integral',
};

export default function Login() {
  const { session, loading, signIn, signUp, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [mode, setMode] = useState<'entrar' | 'criar'>(searchParams.get('modo') === 'criar' ? 'criar' : 'entrar');
  const [name, setName] = useState('');
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [year, setYear] = useState('');
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState<SignupClass[]>([]);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() => erroDoRetornoGoogle(searchParams));
  const [busy, setBusy] = useState(false);
  const senhaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode !== 'criar') return;
    let active = true;
    supabase.rpc('list_signup_classes').then(({ data, error: rpcError }) => {
      if (!active) return;
      if (rpcError) setClassesError('Não foi possível carregar as turmas. Tente novamente em instantes.');
      else {
        setClassesError(null);
        setClasses((data ?? []) as SignupClass[]);
      }
    });
    return () => {
      active = false;
    };
  }, [mode]);

  // Enquanto o Supabase troca o ?code= do Google pela sessão, não mostra o formulário.
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-500" role="status">
        Carregando…
      </div>
    );
  }
  if (session) return <Navigate to="/licoes" replace />;

  async function handlePasskey() {
    if (passkeyBusy || busy || googleBusy) return;
    setError(null);
    setPasskeyBusy(true);
    const { error: passkeyError } = await supabase.auth.signInWithPasskey();
    setPasskeyBusy(false);
    if (passkeyError) setError('Não foi possível entrar com a passkey. Tente novamente ou use sua senha.');
  }

  async function handleGoogle() {
    if (googleBusy || busy) return;
    setError(null);
    setGoogleBusy(true);
    const result = await signInWithGoogle();
    // Em caso de sucesso o navegador segue para o Google; só voltamos aqui se algo falhar.
    if (result) {
      setError(result);
      setGoogleBusy(false);
    }
  }

  const years = [...new Set(classes.map((c) => c.school_year))].sort((a, b) => a - b);
  const classesOfYear = classes.filter((c) => String(c.school_year) === year);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nick.trim() || !password) {
      setError('Preencha o nick e a senha.');
      return;
    }
    if (!NICK_REGEX.test(nick.trim())) {
      setError('Nick inválido: use de 3 a 20 letras, números ou _.');
      return;
    }
    if (mode === 'criar') {
      if (!name.trim()) {
        setError('Informe seu nome.');
        return;
      }
      if (!year || !classId) {
        setError('Escolha o ano e a sala.');
        return;
      }
    }
    setBusy(true);
    const result =
      mode === 'entrar'
        ? await signIn(nick.trim(), password)
        : await signUp(name.trim(), nick.trim(), password, classId);
    setBusy(false);
    if (result) {
      setError(result);
      return;
    }
    if (mode === 'entrar') void pedirParaSalvarSenha(nick.trim(), password);
  }

  return (
    <main className="min-h-dvh bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-500 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 md:flex md:items-center md:justify-center md:px-6 md:py-10">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col md:min-h-0 md:flex-row md:overflow-hidden md:rounded-3xl md:shadow-2xl">
        <div className="px-6 pb-8 pt-10 text-white md:flex md:w-1/2 md:flex-col md:justify-between md:p-10">
          <div className="rounded-xl bg-white/95 p-2 md:w-fit">
            <Logo />
          </div>
          <div className="mt-6 md:mt-0">
            <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">Tudo da escola em um só lugar.</h1>
            <p className="mt-3 max-w-sm text-sm text-indigo-100 md:text-base">
              Lições, trabalhos, provas, avisos e calendário, organizados para você.
            </p>
          </div>
        </div>

        <div className="flex-1 rounded-t-3xl bg-white px-6 pb-10 pt-8 shadow-2xl dark:bg-slate-900 md:rounded-none md:p-10 md:shadow-none">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {mode === 'entrar' ? 'Entrar' : 'Criar conta de aluno'}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {mode === 'entrar' ? 'Use seu nick e senha.' : 'Escolha um nick para entrar depois.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate autoComplete="on">
            {mode === 'criar' && (
              <Field id="nome" label="Nome">
                <input
                  id="nome"
                  name="name"
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  enterKeyHint="next"
                />
              </Field>
            )}
            <Field id="nick" label="Nick">
              <input
                id="nick"
                name="username"
                className={inputClass}
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                placeholder="ex.: Lobo_2033"
              />
              {mode === 'criar' && (
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  De 3 a 20 letras, números ou _.
                </span>
              )}
            </Field>
            <Field id="senha" label="Senha">
              <div className="relative">
                <input
                  id="senha"
                  ref={senhaRef}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputClass} pr-20`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-indigo-700 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600 dark:text-indigo-300"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </Field>

            {mode === 'criar' && (
              <>
                <Field id="ano" label="Ano">
                  <select
                    id="ano"
                    className={inputClass}
                    value={year}
                    disabled={!years.length}
                    onChange={(e) => {
                      setYear(e.target.value);
                      setClassId('');
                    }}
                  >
                    <option value="">{years.length ? 'Selecione o ano' : 'Nenhuma turma disponível'}</option>
                    {years.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}º ano
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="sala" label="Sala">
                  <select
                    id="sala"
                    className={inputClass}
                    value={classId}
                    disabled={!year}
                    onChange={(e) => setClassId(e.target.value)}
                  >
                    <option value="">{year ? 'Selecione a sala' : 'Escolha o ano primeiro'}</option>
                    {classesOfYear.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.shift && shiftLabels[c.shift] ? ` · ${shiftLabels[c.shift]}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                {classesError && (
                  <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                    {classesError}
                  </p>
                )}
              </>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white shadow-sm hover:bg-indigo-800 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          {mode === 'entrar' && (
            <button
              type="button"
              onClick={handlePasskey}
              disabled={passkeyBusy || busy || googleBusy}
              aria-busy={passkeyBusy}
              className="mt-4 w-full rounded-xl border border-indigo-200 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {passkeyBusy ? 'Aguardando passkey…' : 'Entrar com passkey'}
            </button>
          )}

          <div className="mt-6 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            ou
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleBusy || busy}
            aria-busy={googleBusy}
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <GoogleIcon />
            {googleBusy ? 'Redirecionando para o Google…' : 'Continuar com Google'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'entrar' ? 'criar' : 'entrar');
              setError(null);
            }}
            className="mt-5 w-full text-center text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
          >
            {mode === 'entrar' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
          </button>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.4 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7-10.1 7-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.3-13.5-10.1l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

// Erros devolvidos pelo Supabase ao voltar do Google, ex.: cancelamento (access_denied).
function erroDoRetornoGoogle(params: URLSearchParams): string | null {
  if (!params.get('error')) return null;
  const descricao = (params.get('error_description') ?? '').toLowerCase();
  if (params.get('error') === 'access_denied' || descricao.includes('cancel') || descricao.includes('denied'))
    return 'Login com Google cancelado. Você pode tentar novamente ou entrar com nick e senha.';
  return 'Não foi possível entrar com Google. Tente novamente ou use nick e senha.';
}

/**
 * Pede ao navegador que ofereça guardar o nick e a senha. Quem decide mostrar o
 * aviso é o próprio navegador (Chrome/Android costumam exibir; Safari pode ignorar).
 */
async function pedirParaSalvarSenha(nick: string, senha: string) {
  try {
    const Construtor = (
      window as Window & {
        PasswordCredential?: new (dados: { id: string; password: string; name?: string }) => Credential;
      }
    ).PasswordCredential;
    if (!Construtor || !navigator.credentials?.store) return;
    await navigator.credentials.store(new Construtor({ id: nick, password: senha, name: nick }));
  } catch {
    // Se o navegador recusar, o login continua normalmente.
  }
}

export const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 md:text-sm';

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}
