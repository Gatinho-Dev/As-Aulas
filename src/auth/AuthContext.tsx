import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Profile = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_path: string | null;
  role: 'admin' | 'student' | 'teacher';
  active: boolean;
  tutorial_concluido_em: string | null;
  /** Conta de demonstração: o tutorial abre em todo acesso, mesmo já concluído. */
  tutorial_sempre_visivel: boolean;
  profile_completed_at: string | null;
};

const CAMPOS_PERFIL =
  'id, display_name, username, avatar_path, role, active, tutorial_concluido_em, tutorial_sempre_visivel, profile_completed_at';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (nick: string, password: string) => Promise<string | null>;
  signUp: (name: string, nick: string, password: string, classId: string) => Promise<string | null>;
  signInTeacher: (email: string, password: string) => Promise<string | null>;
  signUpTeacher: (fullName: string, email: string, password: string) => Promise<{ error: string | null; userId: string | null }>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  concluirTutorial: (concluido: boolean) => Promise<string | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile(userId: string | undefined) {
      if (!userId) {
        setProfile(null);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select(CAMPOS_PERFIL)
        .eq('id', userId)
        .maybeSingle();
      if (active) setProfile((data as Profile | null) ?? null);
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadProfile(next?.user.id);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(nick: string, password: string) {
    // O nick aponta para o e-mail interno da conta. Trocar o nick depois não quebra o login.
    const { data: email, error: erroBusca } = await supabase.rpc('email_de_login_por_nick', { p_nick: nick.trim() });
    if (erroBusca) return traduzirErro(erroBusca.message);
    if (!email) return 'Nick ou senha incorretos.';
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return traduzirErro(error.message);
    // Conta de professor nunca entra pelo login de aluno.
    const userId = data.user?.id;
    if (userId) {
      const { data: perfil } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      if ((perfil as { role?: string } | null)?.role === 'teacher') {
        await supabase.auth.signOut();
        return 'Esta conta é de professor. Entre pela Área dos professores.';
      }
    }
    return null;
  }

  async function signUp(name: string, nick: string, password: string, classId: string) {
    const { error } = await supabase.auth.signUp({
      // E-mail interno aleatório: não depende do nick, que o aluno pode trocar depois.
      email: emailInternoAleatorio(),
      password,
      options: { data: { display_name: name, username: nick.trim(), class_id: classId } },
    });
    return error ? traduzirErro(error.message) : null;
  }

  async function signInTeacher(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? traduzirErroProfessor(error.message) : null;
  }

  async function signUpTeacher(fullName: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: fullName.trim() } },
    });
    if (error) return { error: traduzirErroProfessor(error.message), userId: null };
    return { error: null, userId: data.user?.id ?? null };
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/entrar` },
    });
    return error ? traduzirErroGoogle(error.message) : null;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    const userId = session?.user.id;
    if (!userId) return;
    const { data } = await supabase
      .from('profiles')
      .select(CAMPOS_PERFIL)
      .eq('id', userId)
      .maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }

  async function concluirTutorial(concluido: boolean) {
    const userId = session?.user.id;
    if (!userId) return 'Sessão expirada. Entre novamente.';
    const valor = concluido ? new Date().toISOString() : null;
    const { error } = await supabase.from('profiles').update({ tutorial_concluido_em: valor }).eq('id', userId);
    if (error) return 'Não foi possível salvar o progresso do tutorial.';
    setProfile((atual) => (atual ? { ...atual, tutorial_concluido_em: valor } : atual));
    return null;
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signInTeacher, signUpTeacher, signInWithGoogle, signOut, refreshProfile, concluirTutorial }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return ctx;
}

// Contas de aluno entram com nick; o nick é um apelido trocável e aponta para o e-mail interno.
export const NICK_REGEX = /^[A-Za-z0-9_.]{3,20}$/;

function emailInternoAleatorio(): string {
  return `${crypto.randomUUID()}@alunos.as-aulas.local`;
}

function traduzirErroProfessor(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid email or password')) return 'E-mail ou senha incorretos.';
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists'))
    return 'Já existe uma conta com este e-mail. Tente entrar.';
  if (m.includes('password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.';
  if (m.includes('fetch') || m.includes('network')) return 'Falha de conexão. Verifique sua internet e tente novamente.';
  return 'Não foi possível concluir. Verifique os dados e tente novamente.';
}

function traduzirErroGoogle(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('provider is not enabled') || m.includes('unsupported provider'))
    return 'O login com Google não está disponível no momento.';
  if (m.includes('fetch') || m.includes('network')) return 'Falha de conexão. Verifique sua internet e tente novamente.';
  return 'Não foi possível iniciar o login com Google. Tente novamente.';
}

function traduzirErro(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Nick ou senha incorretos.';
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('profiles_username'))
    return 'Já existe uma conta com este nick.';
  if (m.includes('password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
  if (m.includes('email not confirmed')) return 'Confirme seu acesso antes de entrar.';
  if (m.includes('username') || m.includes('profiles_username_check'))
    return 'Nick inválido: use de 3 a 20 letras, números ou _.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.';
  if (m.includes('fetch') || m.includes('network')) return 'Falha de conexão. Verifique sua internet e tente novamente.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}
