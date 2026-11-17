import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { mensagemErroPerfil } from '../lib/errosPerfil';
import { TEMA_KEY } from '../theme';
import { inputClass } from './Login';

type Aba = 'conta' | 'perfil' | 'aparencia' | 'seguranca' | 'privacidade' | 'notificacoes';
type Tema = 'claro' | 'escuro' | 'sistema';

const ABAS: { id: Aba; label: string }[] = [
  { id: 'conta', label: 'Minha conta' },
  { id: 'perfil', label: 'Meu perfil' },
  { id: 'aparencia', label: 'Aparência' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'privacidade', label: 'Privacidade' },
  { id: 'notificacoes', label: 'Notificações' },
];

type Preferencias = {
  tema: Tema;
  perfil_visivel_colegas: boolean;
  notif_avisos: boolean;
  notif_atividades: boolean;
  notif_eventos: boolean;
};

type Feedback = { tipo: 'ok' | 'erro'; texto: string } | null;

const btnPrimario =
  'rounded-lg bg-indigo-800 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-900 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-indigo-600';

const btnPerigo =
  'rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-red-600';

function aplicarTema(tema: Tema) {
  const escuro = tema === 'escuro' || (tema === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', escuro);
  if (tema === 'sistema') localStorage.removeItem(TEMA_KEY);
  else localStorage.setItem(TEMA_KEY, tema);
}

function Mensagem({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      role={feedback.tipo === 'erro' ? 'alert' : 'status'}
      className={`rounded-lg px-3 py-2 text-sm ${
        feedback.tipo === 'erro'
          ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
          : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
      }`}
    >
      {feedback.texto}
    </p>
  );
}

type PasskeyItem = { id: string; friendly_name?: string; created_at: string; last_used_at?: string };

function Passkeys() {
  const [passkeys, setPasskeys] = useState<PasskeyItem[] | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    const { data, error } = await supabase.auth.passkey.list();
    if (error) {
      setFeedback({ tipo: 'erro', texto: 'Não foi possível carregar suas passkeys.' });
      return;
    }
    setPasskeys(data ?? []);
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cadastrar() {
    setFeedback(null);
    setOcupado(true);
    const { error } = await supabase.auth.registerPasskey();
    setOcupado(false);
    if (error) {
      setFeedback({ tipo: 'erro', texto: 'Não foi possível cadastrar a passkey. Tente novamente.' });
      return;
    }
    setFeedback({ tipo: 'ok', texto: 'Passkey cadastrada. Use-a na próxima vez que entrar.' });
    await carregar();
  }

  async function remover(id: string) {
    setFeedback(null);
    setOcupado(true);
    const { error } = await supabase.auth.passkey.delete({ passkeyId: id });
    setOcupado(false);
    if (error) {
      setFeedback({ tipo: 'erro', texto: 'Não foi possível remover a passkey.' });
      return;
    }
    setFeedback({ tipo: 'ok', texto: 'Passkey removida.' });
    await carregar();
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-semibold">Passkey</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Entre sem senha usando a digital, o rosto ou o PIN do seu dispositivo.
      </p>
      <Mensagem feedback={feedback} />
      {passkeys === null ? (
        <p className="text-sm text-slate-500">Carregando…</p>
      ) : passkeys.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma passkey cadastrada.</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {passkeys.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm">
                {p.friendly_name || 'Passkey'}
                <span className="block text-xs text-slate-500">
                  Cadastrada em {new Date(p.created_at).toLocaleDateString('pt-BR')}
                </span>
              </span>
              <button type="button" disabled={ocupado} onClick={() => remover(p.id)} className={btnPerigo}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" disabled={ocupado} onClick={cadastrar} className={btnPrimario}>
        {ocupado ? 'Aguarde…' : 'Cadastrar nova passkey'}
      </button>
    </section>
  );
}

export default function Configuracoes() {
  const { session, profile, refreshProfile } = useAuth();
  const userId = session?.user.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const abaParam = searchParams.get('aba') as Aba | null;
  const aba: Aba = ABAS.some((a) => a.id === abaParam) ? (abaParam as Aba) : 'conta';

  const [prefs, setPrefs] = useState<Preferencias | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [salvando, setSalvando] = useState(false);

  const [nick, setNick] = useState(profile?.username ?? '');
  const [nome, setNome] = useState(profile?.display_name ?? '');
  const [senha, setSenha] = useState('');
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setNick(profile?.username ?? '');
    setNome(profile?.display_name ?? '');
  }, [profile?.username, profile?.display_name]);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('tema, perfil_visivel_colegas, notif_avisos, notif_atividades, notif_eventos')
        .eq('id', userId)
        .maybeSingle();
      if (error || !data) {
        setFeedback({ tipo: 'erro', texto: 'Não foi possível carregar suas preferências.' });
        return;
      }
      setPrefs(data as Preferencias);
    })();
  }, [userId]);

  function trocarAba(id: Aba) {
    setFeedback(null);
    setSearchParams({ aba: id }, { replace: true });
  }

  async function salvarNick(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    setSalvando(true);
    const { data, error } = await supabase.rpc('alterar_nick', { p_nick: nick.trim() });
    setSalvando(false);
    if (error) {
      setFeedback({ tipo: 'erro', texto: mensagemErroPerfil(error.message, error.details) });
      return;
    }
    const alterado = (data as { alterado?: boolean } | null)?.alterado !== false;
    await refreshProfile();
    setFeedback({
      tipo: 'ok',
      texto: alterado ? 'Nick atualizado. Você pode trocá-lo novamente em 30 dias.' : 'Esse já é o seu nick.',
    });
  }

  async function salvarNome(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    setSalvando(true);
    const { data, error } = await supabase.rpc('alterar_nome_exibicao', { p_nome: nome.trim() });
    setSalvando(false);
    if (error) {
      setFeedback({ tipo: 'erro', texto: mensagemErroPerfil(error.message, error.details) });
      return;
    }
    const alterado = (data as { alterado?: boolean } | null)?.alterado !== false;
    await refreshProfile();
    setFeedback({
      tipo: 'ok',
      texto: alterado ? 'Nome atualizado. Você pode trocá-lo novamente em 14 dias.' : 'Esse já é o seu nome.',
    });
  }

  async function salvarPreferencia(campo: keyof Preferencias, valor: boolean | Tema) {
    if (!userId || !prefs) return;
    setFeedback(null);
    const anterior = prefs;
    setPrefs({ ...prefs, [campo]: valor } as Preferencias);
    const { error } = await supabase.from('profiles').update({ [campo]: valor }).eq('id', userId);
    if (error) {
      setPrefs(anterior);
      setFeedback({ tipo: 'erro', texto: 'Não foi possível salvar a preferência. Tente novamente.' });
      return;
    }
    if (campo === 'tema') aplicarTema(valor as Tema);
  }

  async function trocarSenha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    if (senha.length < 6) {
      setFeedback({ tipo: 'erro', texto: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (senha !== senhaConfirmacao) {
      setFeedback({ tipo: 'erro', texto: 'As senhas não coincidem.' });
      return;
    }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      setFeedback({ tipo: 'erro', texto: 'Não foi possível trocar a senha. Tente novamente.' });
      return;
    }
    setSenha('');
    setSenhaConfirmacao('');
    setFeedback({ tipo: 'ok', texto: 'Senha alterada.' });
  }

  async function excluirConta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId || confirmacaoExclusao.trim() !== 'EXCLUIR') return;
    setFeedback(null);
    setSalvando(true);

    // Antes de apagar a conta, remove a foto de perfil do Storage: apagar o usuário não toca nos arquivos.
    const { data: arquivos, error: erroLista } = await supabase.storage.from('avatars').list(userId);
    if (erroLista) {
      setSalvando(false);
      setFeedback({ tipo: 'erro', texto: 'Não foi possível excluir sua conta. Tente novamente.' });
      return;
    }
    if (arquivos && arquivos.length > 0) {
      const { error: erroRemocao } = await supabase.storage
        .from('avatars')
        .remove(arquivos.map((arquivo) => `${userId}/${arquivo.name}`));
      if (erroRemocao) {
        setSalvando(false);
        setFeedback({ tipo: 'erro', texto: 'Não foi possível excluir sua conta. Tente novamente.' });
        return;
      }
    }

    const { error } = await supabase.rpc('excluir_minha_conta', { p_confirmacao: confirmacaoExclusao.trim() });
    if (error) {
      setSalvando(false);
      setFeedback({ tipo: 'erro', texto: 'Não foi possível excluir sua conta. Tente novamente.' });
      return;
    }
    await supabase.auth.signOut({ scope: 'local' });
    navigate('/entrar', { replace: true });
  }

  return (
    <section aria-labelledby="titulo-configuracoes" className="space-y-6">
      <div>
        <h1 id="titulo-configuracoes" className="text-2xl font-bold">
          Configurações
        </h1>
      </div>

      <div className="md:flex md:gap-8">
        <nav aria-label="Seções de configurações" className="mb-6 md:mb-0 md:w-52 md:shrink-0">
          <ul className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
            {ABAS.map((a) => (
              <li key={a.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => trocarAba(a.id)}
                  aria-current={aba === a.id ? 'page' : undefined}
                  className={`w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                    aba === a.id
                      ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-5">
          <Mensagem feedback={feedback} />

          {aba === 'conta' && (
            <>
              <form onSubmit={salvarNick} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-semibold">Nick</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Seu nick é usado para entrar no app. Você pode trocá-lo a cada 30 dias.
                </p>
                <label htmlFor="cfg-nick" className="block text-sm font-medium">
                  Nick
                </label>
                <input id="cfg-nick" value={nick} onChange={(e) => setNick(e.target.value)} autoComplete="username" className={inputClass} />
                <button type="submit" disabled={salvando || !nick.trim() || nick.trim() === profile?.username} className={btnPrimario}>
                  Salvar nick
                </button>
              </form>

              <form onSubmit={salvarNome} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-semibold">Nome de exibição</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  É o nome que seus colegas veem. Você pode trocá-lo a cada 14 dias.
                </p>
                <label htmlFor="cfg-nome" className="block text-sm font-medium">
                  Nome
                </label>
                <input id="cfg-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" className={inputClass} />
                <button type="submit" disabled={salvando || !nome.trim() || nome.trim() === profile?.display_name} className={btnPrimario}>
                  Salvar nome
                </button>
              </form>
            </>
          )}

          {aba === 'perfil' && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold">Meu perfil</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Foto, bio, cor de destaque e fonte do seu perfil.</p>
              <Link to="/perfil" className="inline-block text-sm font-medium text-indigo-800 hover:underline dark:text-indigo-300">
                Editar meu perfil
              </Link>
            </div>
          )}

          {aba === 'aparencia' && (
            <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <legend className="font-semibold">Tema</legend>
              {(
                [
                  ['sistema', 'Igual ao sistema'],
                  ['claro', 'Claro'],
                  ['escuro', 'Escuro'],
                ] as [Tema, string][]
              ).map(([valor, rotulo]) => (
                <label key={valor} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="tema"
                    value={valor}
                    checked={prefs?.tema === valor}
                    disabled={!prefs}
                    onChange={() => void salvarPreferencia('tema', valor)}
                  />
                  {rotulo}
                </label>
              ))}
            </fieldset>
          )}

          {aba === 'seguranca' && (
            <form onSubmit={trocarSenha} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold">Trocar senha</h2>
              <label htmlFor="cfg-senha" className="block text-sm font-medium">
                Nova senha
              </label>
              <input
                id="cfg-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
              <label htmlFor="cfg-senha2" className="block text-sm font-medium">
                Confirmar nova senha
              </label>
              <input
                id="cfg-senha2"
                type="password"
                value={senhaConfirmacao}
                onChange={(e) => setSenhaConfirmacao(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
              <button type="submit" disabled={salvando || !senha} className={btnPrimario}>
                Trocar senha
              </button>
            </form>
          )}

          {aba === 'seguranca' && <Passkeys />}

          {aba === 'seguranca' && (
            <form onSubmit={excluirConta} className="space-y-3 rounded-xl border border-red-200 bg-white p-5 dark:border-red-900 dark:bg-slate-900">
              <h2 className="font-semibold text-red-800 dark:text-red-300">Excluir conta</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sua conta, seu perfil, sua foto e todos os seus dados pessoais serão apagados permanentemente. Esta ação não pode ser desfeita.
              </p>
              <label htmlFor="cfg-excluir" className="block text-sm font-medium">
                Digite EXCLUIR para confirmar
              </label>
              <input
                id="cfg-excluir"
                value={confirmacaoExclusao}
                onChange={(e) => setConfirmacaoExclusao(e.target.value)}
                autoComplete="off"
                className={inputClass}
              />
              <button type="submit" disabled={salvando || confirmacaoExclusao.trim() !== 'EXCLUIR'} className={btnPerigo}>
                Excluir minha conta
              </button>
            </form>
          )}

          {aba === 'privacidade' && (
            <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <legend className="font-semibold">Privacidade</legend>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={prefs?.perfil_visivel_colegas ?? true}
                  disabled={!prefs}
                  onChange={(e) => void salvarPreferencia('perfil_visivel_colegas', e.target.checked)}
                />
                <span>
                  Mostrar minha foto e bio para colegas das mesmas turmas.
                  <span className="block text-slate-500">Seu nome continua visível em listas, turmas e atividades.</span>
                </span>
              </label>
            </fieldset>
          )}

          {aba === 'notificacoes' && (
            <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <legend className="font-semibold">Receber notificações de</legend>
              {(
                [
                  ['notif_avisos', 'Avisos'],
                  ['notif_atividades', 'Atividades, trabalhos e provas'],
                  ['notif_eventos', 'Eventos importantes'],
                ] as [keyof Preferencias, string][]
              ).map(([campo, rotulo]) => (
                <label key={campo} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(prefs?.[campo])}
                    disabled={!prefs}
                    onChange={(e) => void salvarPreferencia(campo, e.target.checked)}
                  />
                  {rotulo}
                </label>
              ))}
            </fieldset>
          )}
        </div>
      </div>
    </section>
  );
}
