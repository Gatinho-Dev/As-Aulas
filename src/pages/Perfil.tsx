import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Check, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { mensagemErroPerfil } from '../lib/errosPerfil';
import {
  BUCKET_AVATARES,
  caminhoNovoAvatar,
  extensaoDoTipo,
  urlPublicaAvatar,
  validarFoto,
} from '../lib/avatar';
import AjusteFoto from '../components/AjusteFoto';
import PreviaPerfil, { iniciaisDe } from '../components/PreviaPerfil';
import {
  CORES_PERFIL,
  FONTES_PERFIL,
  corValida,
  fonteValida,
  type CorPerfil,
  type FontePerfil,
} from '../lib/perfilEstilo';
import { anoLabel, TURNO_LABEL } from './Turmas';
import { inputClass } from './Login';

type TurmaDoAluno = {
  class_id: string;
  classes: { name: string; school_year: number; shift: string | null } | null;
};

type DadosPerfil = {
  nome: string;
  bio: string;
  cor: CorPerfil;
  fonte: FontePerfil;
  avatarPath: string | null;
};

const VAZIO: DadosPerfil = { nome: '', bio: '', cor: 'indigo', fonte: 'padrao', avatarPath: null };
const LIMITE_BIO = 280;

export default function Perfil() {
  const { session, profile, refreshProfile } = useAuth();
  const userId = session?.user.id;
  const [editando, setEditando] = useState(false);
  const [dados, setDados] = useState<DadosPerfil>(VAZIO);
  const [rascunho, setRascunho] = useState<DadosPerfil>(VAZIO);
  const [erroCampo, setErroCampo] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [turmas, setTurmas] = useState<TurmaDoAluno[] | null>(null);
  const [ehRepresentante, setEhRepresentante] = useState(false);
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [fotoPronta, setFotoPronta] = useState<Blob | null>(null);
  const [previaFoto, setPreviaFoto] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  // Carrega o perfil uma única vez por usuário: uma renovação de sessão não pode
  // apagar o que a pessoa está digitando.
  const carregadoPara = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !profile || carregadoPara.current === userId) return;
    carregadoPara.current = userId;
    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('bio, accent_color, font_style, avatar_path')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar seu perfil.' });
        return;
      }
      const carregado: DadosPerfil = {
        nome: profile.display_name,
        bio: (data?.bio as string | null) ?? '',
        cor: corValida(data?.accent_color as string | undefined),
        fonte: fonteValida(data?.font_style as string | undefined),
        avatarPath: (data?.avatar_path as string | null) ?? null,
      };
      setDados(carregado);
      setRascunho(carregado);
    })();
  }, [userId, profile]);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const { count } = await supabase
        .from('class_representatives')
        .select('class_id', { count: 'exact', head: true })
        .eq('user_id', userId);
      setEhRepresentante((count ?? 0) > 0);
    })();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const { data, error } = await supabase
        .from('class_memberships')
        .select('class_id, classes(name, school_year, shift)')
        .eq('user_id', userId)
        .eq('membership_status', 'ativo');
      if (error) {
        setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar suas turmas.' });
        setTurmas([]);
        return;
      }
      setTurmas((data ?? []) as unknown as TurmaDoAluno[]);
    })();
  }, [userId]);

  const papel = profile?.role === 'admin' ? 'Administrador' : 'Aluno';
  const fotoSalva = urlPublicaAvatar(dados.avatarPath);
  const fotoEdicao = previaFoto ?? urlPublicaAvatar(removerFoto ? null : dados.avatarPath);
  const temFoto = Boolean(fotoEdicao);
  const alterado = useMemo(
    () =>
      rascunho.nome !== dados.nome ||
      rascunho.bio !== dados.bio ||
      rascunho.cor !== dados.cor ||
      rascunho.fonte !== dados.fonte ||
      Boolean(fotoPronta) ||
      (removerFoto && Boolean(dados.avatarPath)),
    [rascunho, dados, fotoPronta, removerFoto],
  );

  function iniciarEdicao() {
    setRascunho(dados);
    setErroCampo(null);
    setErroFoto(null);
    setMensagem(null);
    setRemoverFoto(false);
    limparFotoSelecionada();
    setEditando(true);
  }

  function cancelarEdicao() {
    setRascunho(dados);
    setErroCampo(null);
    setErroFoto(null);
    setRemoverFoto(false);
    limparFotoSelecionada();
    setEditando(false);
  }

  function limparFotoSelecionada() {
    setArquivoFoto(null);
    setFotoPronta(null);
    setPreviaFoto(null);
  }

  // Libera a URL temporária da prévia quando ela muda ou o componente sai de cena.
  useEffect(() => {
    if (!previaFoto) return;
    return () => URL.revokeObjectURL(previaFoto);
  }, [previaFoto]);

  function escolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    const problema = validarFoto(arquivo);
    if (problema) {
      setErroFoto(problema);
      return;
    }
    setErroFoto(null);
    setArquivoFoto(arquivo);
    setRemoverFoto(false);
  }

  function cancelarEnquadramento() {
    setArquivoFoto(null);
    setErroFoto(null);
  }

  function aplicarEnquadramento(blob: Blob) {
    setFotoPronta(blob);
    setPreviaFoto(URL.createObjectURL(blob));
    setArquivoFoto(null);
    setErroFoto(null);
    setRemoverFoto(false);
  }

  function removerFotoAtual() {
    setErroFoto(null);
    if (fotoPronta) {
      // Descarta a troca pendente e volta para a foto que já está salva.
      setFotoPronta(null);
      setPreviaFoto(null);
      return;
    }
    setRemoverFoto(true);
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nome = rascunho.nome.trim();
    const bio = rascunho.bio.replace(/\s+$/, '');
    setMensagem(null);
    if (!nome) {
      setErroCampo('Informe seu nome.');
      return;
    }
    if (nome.length > 80) {
      setErroCampo('O nome pode ter no máximo 80 caracteres.');
      return;
    }
    if (bio.trim().length > LIMITE_BIO) {
      setErroCampo(`A bio pode ter no máximo ${LIMITE_BIO} caracteres.`);
      return;
    }
    setErroCampo(null);
    if (!userId) return;
    setSalvando(true);
    setMensagem(null);

    // O nome tem prazo de troca e passa pela função do servidor, nunca por UPDATE direto.
    if (nome !== dados.nome) {
      const { error: erroNome } = await supabase.rpc('alterar_nome_exibicao', { p_nome: nome });
      if (erroNome) {
        setSalvando(false);
        setMensagem({ tipo: 'erro', texto: mensagemErroPerfil(erroNome.message, erroNome.details) });
        return;
      }
    }

    let caminhoFinal = removerFoto ? null : dados.avatarPath;
    let enviado: string | null = null;

    if (fotoPronta) {
      const caminho = caminhoNovoAvatar(userId, extensaoDoTipo(fotoPronta.type));
      const { error: erroUpload } = await supabase.storage
        .from(BUCKET_AVATARES)
        .upload(caminho, fotoPronta, { contentType: fotoPronta.type || 'image/webp', upsert: false });
      if (erroUpload) {
        setSalvando(false);
        setMensagem({ tipo: 'erro', texto: 'Não foi possível enviar a foto. Tente novamente.' });
        return;
      }
      enviado = caminho;
      caminhoFinal = caminho;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        bio: bio.trim() || null,
        accent_color: rascunho.cor,
        font_style: rascunho.fonte,
        avatar_path: caminhoFinal,
      })
      .eq('id', userId);

    if (error) {
      if (enviado) await supabase.storage.from(BUCKET_AVATARES).remove([enviado]);
      setSalvando(false);
      setMensagem({ tipo: 'erro', texto: 'Não foi possível salvar o perfil. Tente novamente.' });
      return;
    }

    const anterior = dados.avatarPath;
    if (anterior && anterior !== caminhoFinal) {
      await supabase.storage.from(BUCKET_AVATARES).remove([anterior]);
    }

    await refreshProfile();
    const salvo = { ...rascunho, nome, bio: bio.trim(), avatarPath: caminhoFinal };
    limparFotoSelecionada();
    setRemoverFoto(false);
    setDados(salvo);
    setRascunho(salvo);
    setSalvando(false);
    setEditando(false);
    setMensagem({ tipo: 'ok', texto: 'Perfil atualizado.' });
  }

  return (
    <section aria-labelledby="titulo-perfil" className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="titulo-perfil" className="text-2xl font-bold">
            Meu perfil
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            {editando
              ? 'A prévia ao lado muda enquanto você edita.'
              : 'É assim que seu perfil aparece para os colegas da sua turma.'}
          </p>
        </div>
        {!editando && (
          <button
            type="button"
            onClick={iniciarEdicao}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Editar perfil
          </button>
        )}
      </div>

      {mensagem && (
        <p
          role={mensagem.tipo === 'erro' ? 'alert' : 'status'}
          className={`rounded-lg px-3 py-2 text-sm ${
            mensagem.tipo === 'erro'
              ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
              : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
          }`}
        >
          {mensagem.texto}
        </p>
      )}

      {!editando ? (
        <PreviaPerfil
          nome={dados.nome}
          nick={profile?.username}
          fotoUrl={fotoSalva}
          bio={dados.bio}
          cor={dados.cor}
          fonte={dados.fonte}
          papel={papel}
          legenda="Seu e-mail é privado. Colegas da mesma turma veem foto, nome, nick, bio, cor e fonte."
        />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <form onSubmit={salvar} noValidate className="order-2 space-y-8 lg:order-1">
            <fieldset className="space-y-4">
              <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Identidade
              </legend>
              <div>
                <p className="text-sm font-medium">Foto de perfil</p>
                {arquivoFoto ? (
                  <div className="mt-2">
                    <AjusteFoto
                      arquivo={arquivoFoto}
                      onAplicar={aplicarEnquadramento}
                      onCancelar={cancelarEnquadramento}
                    />
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <span
                      className={`flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-semibold ${CORES_PERFIL[rascunho.cor].avatar}`}
                      aria-hidden="true"
                    >
                      {fotoEdicao ? (
                        <img src={fotoEdicao} alt="" className="size-full object-cover" />
                      ) : (
                        iniciaisDe(rascunho.nome) || '?'
                      )}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor="perfil-foto"
                        className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        {temFoto ? 'Trocar foto' : 'Escolher foto'}
                      </label>
                      <input
                        id="perfil-foto"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={escolherFoto}
                        className="sr-only"
                      />
                      {temFoto && (
                        <button
                          type="button"
                          onClick={removerFotoAtual}
                          className="text-sm font-medium text-red-700 hover:underline dark:text-red-300"
                        >
                          {fotoPronta ? 'Descartar troca' : 'Remover'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  JPG, PNG, WebP ou GIF até 2 MB. Você escolhe o enquadramento antes de salvar.
                </p>
                {erroFoto && (
                  <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-300">
                    {erroFoto}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="perfil-nome" className="block text-sm font-medium">
                  Nome exibido
                </label>
                <input
                  id="perfil-nome"
                  type="text"
                  maxLength={80}
                  value={rascunho.nome}
                  onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
                  aria-invalid={erroCampo ? true : undefined}
                  aria-describedby="perfil-nome-dica"
                  className={`mt-1 ${inputClass}`}
                />
                <p id="perfil-nome-dica" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  É o nome que aparece no seu perfil e nos lugares da plataforma.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Nick de entrada</p>
                <p className="mt-1 inline-flex rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  @{profile?.username ?? '—'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  O nick é usado para entrar e não pode ser alterado por aqui.
                </p>
              </div>
            </fieldset>

            <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="flex items-end justify-between gap-3">
                <label htmlFor="perfil-bio" className="block text-sm font-medium">
                  Bio
                </label>
                <span
                  className={`text-xs tabular-nums ${
                    rascunho.bio.length > LIMITE_BIO ? 'text-red-600' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {rascunho.bio.length}/{LIMITE_BIO}
                </span>
              </div>
              <textarea
                id="perfil-bio"
                rows={4}
                maxLength={LIMITE_BIO}
                value={rascunho.bio}
                onChange={(e) => setRascunho({ ...rascunho, bio: e.target.value })}
                aria-describedby="perfil-bio-dica"
                placeholder="Conte o que você gosta de estudar, seus hobbies ou uma frase que te representa."
                className={`mt-1 resize-y ${inputClass}`}
              />
              <p id="perfil-bio-dica" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Aparece na seção “Sobre mim” do seu perfil.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
              <p id="rotulo-cor" className="text-sm font-medium">
                Cor de destaque
              </p>
              <div role="group" aria-labelledby="rotulo-cor" className="mt-3 flex flex-wrap items-center gap-3">
                {(Object.keys(CORES_PERFIL) as CorPerfil[]).map((c) => {
                  const selecionada = rascunho.cor === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={selecionada}
                      aria-label={CORES_PERFIL[c].nome}
                      title={CORES_PERFIL[c].nome}
                      onClick={() => setRascunho({ ...rascunho, cor: c })}
                      className={`flex size-9 items-center justify-center rounded-full transition ${CORES_PERFIL[c].avatar} ${
                        selecionada
                          ? 'ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-950'
                          : 'ring-1 ring-black/10 hover:scale-105'
                      }`}
                    >
                      {selecionada && <Check className="size-4" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Usada no avatar e no seu nome. Agora: {CORES_PERFIL[rascunho.cor].nome}.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
              <p id="rotulo-fonte" className="text-sm font-medium">
                Fonte do nome e da bio
              </p>
              <div role="group" aria-labelledby="rotulo-fonte" className="mt-3 grid gap-2 sm:grid-cols-3">
                {(Object.keys(FONTES_PERFIL) as FontePerfil[]).map((f) => {
                  const selecionada = rascunho.fonte === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={selecionada}
                      onClick={() => setRascunho({ ...rascunho, fonte: f })}
                      className={`rounded-xl border px-3 py-3 text-left transition ${FONTES_PERFIL[f].classe} ${
                        selecionada
                          ? 'border-indigo-700 bg-indigo-50 dark:border-indigo-300 dark:bg-indigo-950/40'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className="flex items-baseline justify-between">
                        <span className="text-xl font-semibold">Aa</span>
                        {selecionada && <Check className="size-4 text-indigo-700 dark:text-indigo-300" aria-hidden="true" />}
                      </span>
                      <span className="mt-1 block text-xs font-medium">{FONTES_PERFIL[f].nome}</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        {FONTES_PERFIL[f].exemplo}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {erroCampo && (
              <p id="perfil-erro" role="alert" className="text-sm text-red-700 dark:text-red-300">
                {erroCampo}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              <button
                type="submit"
                disabled={salvando || !alterado}
                className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {salvando ? 'Salvando…' : 'Salvar perfil'}
              </button>
              <button
                type="button"
                onClick={cancelarEdicao}
                disabled={salvando}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <span
                role="status"
                className={`text-xs ${
                  alterado ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {alterado ? 'Alterações não salvas' : 'Tudo salvo'}
              </span>
            </div>
          </form>

          <aside className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-20">
              <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Prévia em tempo real
              </p>
              <PreviaPerfil
                nome={rascunho.nome}
                nick={profile?.username}
                fotoUrl={fotoEdicao}
                bio={rascunho.bio}
                cor={rascunho.cor}
                fonte={rascunho.fonte}
                papel={papel}
                placeholderBio="Sua bio aparece aqui enquanto você escreve."
              />
              <p className="mt-6 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                É assim que os colegas da sua turma verão o perfil depois que você salvar.
              </p>
            </div>
          </aside>
        </div>
      )}

      <section aria-labelledby="perfil-conta" className="space-y-3 border-t border-slate-200 pt-8 dark:border-slate-800">
        <h2 id="perfil-conta" className="text-lg font-semibold">
          Conta
        </h2>
        <div>
          <p className="text-sm font-medium">Tipo de conta</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{papel}</p>
          <p className="mt-4 text-sm font-medium">E-mail</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{session?.user.email ?? '—'}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Privado: nenhum colega consegue ver este e-mail.
          </p>
          {profile?.role === 'admin' && (
            <Link
              to="/admin"
              className="mt-4 inline-flex rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
            >
              Abrir painel admin
            </Link>
          )}
          {ehRepresentante && (
            <Link
              to="/representante"
              className="mt-3 inline-flex rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
            >
              Área do representante
            </Link>
          )}
        </div>
      </section>

      <section aria-labelledby="perfil-turmas" className="space-y-3">
        <h2 id="perfil-turmas" className="text-lg font-semibold">
          Minhas turmas
        </h2>
        {turmas === null ? (
          <div className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" role="status" aria-label="Carregando turmas" />
        ) : turmas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm dark:border-slate-700">
            Você ainda não está em nenhuma turma ativa.
          </p>
        ) : (
          <ul className="space-y-2">
            {turmas.map((t) => (
              <li key={t.class_id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="font-semibold">{t.classes?.name ?? 'Turma'}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t.classes ? `${anoLabel(t.classes.school_year)}${t.classes.shift ? ` · ${TURNO_LABEL[t.classes.shift] ?? t.classes.shift}` : ''}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
