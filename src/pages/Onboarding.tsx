import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

const NICK_REGEX = /^[A-Za-z0-9_.]{3,20}$/;

const ERROS: Record<string, string> = {
  NICK_INVALIDO: 'Nick inválido: use de 3 a 20 letras, números, _ ou ponto.',
  NICK_RESERVADO: 'Este nick não está disponível. Escolha outro.',
  NICK_EM_USO: 'Este nick já está em uso. Escolha outro.',
  NOME_INVALIDO: 'Informe um nome com de 2 a 40 caracteres.',
  PERFIL_JA_CONCLUIDO: 'Seu perfil já foi configurado.',
};

export function precisaOnboarding(profile: { profile_completed_at: string | null } | null): boolean {
  return !!profile && !profile.profile_completed_at;
}

export default function Onboarding() {
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [nick, setNick] = useState('');
  const [nome, setNome] = useState(profile?.display_name ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!precisaOnboarding(profile)) return <Navigate to="/" replace />;

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const nickLimpo = nick.trim();
    if (!NICK_REGEX.test(nickLimpo)) {
      setErro(ERROS.NICK_INVALIDO);
      return;
    }
    if (nome.trim().length < 2) {
      setErro(ERROS.NOME_INVALIDO);
      return;
    }
    setEnviando(true);
    const { error } = await supabase.rpc('concluir_perfil', { p_nick: nickLimpo, p_nome: nome.trim() });
    setEnviando(false);
    if (error) {
      setErro(ERROS[error.message.trim()] ?? 'Não foi possível salvar. Tente novamente.');
      return;
    }
    await refreshProfile();
    navigate('/', { replace: true });
  }

  return (
    <section aria-labelledby="titulo-onboarding" className="mx-auto max-w-md space-y-6">
      <div>
        <h1 id="titulo-onboarding" className="text-2xl font-bold">
          Bem-vindo ao As Aulas
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Antes de continuar, escolha seu nick e o nome que aparece para seus colegas. Você poderá alterar depois em Configurações.
        </p>
      </div>

      <form onSubmit={salvar} noValidate className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label htmlFor="onb-nick" className="block text-sm font-medium">
            Nick
          </label>
          <input
            id="onb-nick"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            autoComplete="username"
            aria-describedby="onb-nick-ajuda"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
          <p id="onb-nick-ajuda" className="mt-1 text-xs text-slate-500">
            De 3 a 20 letras, números, _ ou ponto. Use para entrar no app.
          </p>
        </div>

        <div>
          <label htmlFor="onb-nome" className="block text-sm font-medium">
            Nome de exibição
          </label>
          <input
            id="onb-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="name"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
        </div>

        {erro && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando || !session}
          className="w-full rounded-lg bg-indigo-800 px-4 py-2 font-medium text-white hover:bg-indigo-900 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-indigo-600"
        >
          {enviando ? 'Salvando…' : 'Continuar'}
        </button>
      </form>
    </section>
  );
}
