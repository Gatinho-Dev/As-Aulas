import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';

type Conquista = { achievement_code: string; unlocked_at: string; xp_awarded: number };
type Meta = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  tracking_type: 'quantidade_atividades' | 'manual';
  target_count: number | null;
  subject_id: string | null;
  start_date?: string;
  due_date: string | null;
  completed_at: string | null;
};
type Materia = { id: string; name: string };

type Dados = { conquistas: Conquista[]; xp: number; metas: Meta[]; materias: Materia[]; atividades: Atividade[] };

type Atividade = { completed_at: string; subject_id: string };

const META_COLS = 'id, title, description, status, tracking_type, target_count, subject_id, start_date, due_date, completed_at';

// Conta atividades concluídas desde o início da meta (e da matéria, se houver). Usa só registros reais.
function contarAtividades(m: Meta & { start_date?: string }, atividades: Atividade[]): number {
  return atividades.filter((a) => {
    if (m.subject_id && a.subject_id !== m.subject_id) return false;
    return !m.start_date || a.completed_at.slice(0, 10) >= m.start_date;
  }).length;
}

async function carregar(): Promise<Dados> {
  // Primeiro sincroniza conquistas e metas automáticas; depois lê os dados já atualizados
  const sync = await supabase.rpc('sincronizar_conquistas');
  if (sync.error) throw new Error(sync.error.message);
  const [xp, metas, materias, atividades] = await Promise.all([
    supabase.from('user_xp_events').select('amount'),
    supabase.from('user_goals').select(META_COLS).order('created_at'),
    supabase.from('subjects').select('id, name').eq('active', true).order('name'),
    supabase
      .from('assignment_progress')
      .select('completed_at, assignments!inner(subject_id)')
      .eq('personal_status', 'concluida'),
  ]);
  if (xp.error) throw new Error(xp.error.message);
  if (metas.error) throw new Error(metas.error.message);
  if (materias.error) throw new Error(materias.error.message);
  if (atividades.error) throw new Error(atividades.error.message);
  const conquistas = (sync.data ?? []) as Conquista[];
  const total = ((xp.data ?? []) as { amount: number }[]).reduce((soma, linha) => soma + linha.amount, 0);
  const lista = ((atividades.data ?? []) as unknown as { completed_at: string; assignments: { subject_id: string } }[])
    .map((linha) => ({ completed_at: linha.completed_at, subject_id: linha.assignments.subject_id }));
  return {
    conquistas,
    xp: total,
    metas: (metas.data ?? []) as unknown as Meta[],
    materias: (materias.data ?? []) as Materia[],
    atividades: lista,
  };
}

export default function Conquistas() {
  const { profile, session } = useAuth();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<string>('todas');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroMeta, setErroMeta] = useState<string | null>(null);

  function recarregar() {
    carregar()
      .then(setDados)
      .catch(() => setErro('Não foi possível carregar suas conquistas. Tente novamente.'));
  }

  useEffect(() => {
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function criarMeta(form: FormData) {
    const titulo = String(form.get('titulo') ?? '').trim();
    const descricao = String(form.get('descricao') ?? '').trim();
    const tipo = String(form.get('tipo') ?? 'manual');
    const alvo = Number(form.get('alvo'));
    const materia = String(form.get('materia') ?? '');
    const prazo = String(form.get('prazo') ?? '');
    if (!titulo || titulo.length > 120) return setErroMeta('Informe um título com até 120 caracteres.');
    if (tipo === 'quantidade_atividades' && (!Number.isInteger(alvo) || alvo < 1 || alvo > 1000)) {
      return setErroMeta('Informe um objetivo numérico entre 1 e 1000.');
    }
    const userId = session?.user.id;
    if (!userId) return setErroMeta('Sessão expirada. Entre novamente.');
    setSalvando(true);
    setErroMeta(null);
    const { error } = await supabase.from('user_goals').insert({
      user_id: userId,
      title: titulo,
      description: descricao || null,
      category: materia ? 'materia' : 'outra',
      subject_id: materia || null,
      tracking_type: tipo,
      target_count: tipo === 'quantidade_atividades' ? alvo : null,
      due_date: prazo || null,
    });
    setSalvando(false);
    if (error) return setErroMeta('Não foi possível salvar a meta. Tente novamente.');
    setMostrarForm(false);
    recarregar();
  }

  async function concluirMeta(id: string) {
    const { error } = await supabase
      .from('user_goals')
      .update({ status: 'concluida', completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tracking_type', 'manual');
    if (error) return setErroMeta('Não foi possível concluir a meta. Tente novamente.');
    recarregar();
  }

  if (erro) return <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{erro}</p>;
  if (!dados) return <div role="status" aria-label="Carregando conquistas" className="h-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />;

  const desbloqueadas = new Map(dados.conquistas.map((c) => [c.achievement_code, c.unlocked_at]));
  const termo = busca.trim().toLowerCase();
  const lista = Object.entries(CATALOGO).filter(([codigo, c]) => {
    const estado = desbloqueadas.has(codigo);
    if (filtro === 'desbloqueadas' && !estado) return false;
    if (filtro === 'bloqueadas' && estado) return false;
    if (filtro !== 'todas' && filtro !== 'desbloqueadas' && filtro !== 'bloqueadas' && c.categoria !== filtro) return false;
    return !termo || c.nome.toLowerCase().includes(termo) || c.descricao.toLowerCase().includes(termo);
  });
  const metasConcluidas = dados.metas.filter((m) => m.status === 'concluida').length;
  const metasEmAndamento = dados.metas.filter((m) => m.status === 'em_andamento').length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Conquistas e Metas</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Pequenos passos, grandes conquistas. Acompanhe seu progresso e alcance seus objetivos.</p>
        <p className="mt-2 text-sm text-slate-500">{profile?.display_name}</p>
      </header>

      <section aria-label="Resumo" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao titulo="Conquistas" valor={`${dados.conquistas.length} de ${CATALOGO_TOTAL}`} />
        <Cartao titulo="XP" valor={String(dados.xp)} />
        <Cartao titulo="Metas concluídas" valor={String(metasConcluidas)} />
        <Cartao titulo="Metas em andamento" valor={String(metasEmAndamento)} />
      </section>

      <section aria-label="Minhas conquistas" className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Minhas conquistas</h2>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="sr-only">Buscar conquista</span>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou descrição" className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
          </label>
          <label className="text-sm">
            <span className="mr-2 text-slate-600 dark:text-slate-400">Mostrar</span>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <option value="todas">Todas</option>
              <option value="Primeiros passos">Primeiros passos</option>
              <option value="Organização">Organização</option>
              <option value="Persistência">Persistência</option>
              <option value="Aprendizado">Aprendizado</option>
              <option value="desbloqueadas">Desbloqueadas</option>
              <option value="bloqueadas">Bloqueadas</option>
            </select>
          </label>
        </div>
        {lista.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">Nenhuma conquista encontrada com este filtro.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map(([codigo, c]) => {
              const data = desbloqueadas.get(codigo);
              return (
                <li key={codigo} className={`rounded-xl border p-4 ${data ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{c.categoria}</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">{c.nome}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{c.descricao}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{data ? `Conquistada em ${new Date(data).toLocaleDateString('pt-BR')}` : 'Ainda não conquistada'}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Minhas metas" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Minhas metas</h2>
          <button type="button" onClick={() => setMostrarForm((v) => !v)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
            Criar meta
          </button>
        </div>
        {erroMeta && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erroMeta}</p>}
        {mostrarForm && (
          <form
            aria-label="Nova meta"
            onSubmit={(e) => {
              e.preventDefault();
              criarMeta(new FormData(e.currentTarget));
            }}
            className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2"
          >
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Título da meta</span>
              <input name="titulo" required maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Descrição (opcional)</span>
              <textarea name="descricao" maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-sm">
              <span className="font-medium">Tipo de acompanhamento</span>
              <select name="tipo" defaultValue="manual" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                <option value="manual">Conclusão manual (meta pessoal)</option>
                <option value="quantidade_atividades">Contagem de atividades concluídas</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="font-medium">Objetivo numérico (para contagem)</span>
              <input name="alvo" type="number" min={1} max={1000} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-sm">
              <span className="font-medium">Matéria relacionada (opcional)</span>
              <select name="materia" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                <option value="">Nenhuma</option>
                {dados.materias.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-medium">Prazo (opcional)</span>
              <input name="prazo" type="date" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" disabled={salvando} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {salvando ? 'Salvando…' : 'Salvar meta'}
              </button>
              <button type="button" onClick={() => setMostrarForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">
                Cancelar
              </button>
            </div>
          </form>
        )}
        {dados.metas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">Você ainda não criou metas. Que tal começar com uma?</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {dados.metas.map((m) => {
              const materia = dados.materias.find((x) => x.id === m.subject_id)?.name;
              const concluida = m.status === 'concluida';
              const feitas = m.tracking_type === 'quantidade_atividades' ? contarAtividades(m, dados.atividades) : 0;
              const percentual = m.target_count ? Math.min(100, Math.round((feitas / m.target_count) * 100)) : 0;
              return (
                <li key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="font-semibold text-slate-900 dark:text-white">{m.title}</p>
                  {m.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{m.description}</p>}
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                    {m.tracking_type === 'quantidade_atividades' ? `Acompanhamento automático: ${m.target_count} atividades` : 'Acompanhamento manual'}
                    {materia ? ` · ${materia}` : ''}
                    {m.due_date ? ` · Prazo: ${new Date(m.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
                  </p>
                  {m.tracking_type === 'quantidade_atividades' && m.target_count && (
                    <div className="mt-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300">Progresso: {Math.min(feitas, m.target_count)} de {m.target_count} atividades</p>
                      <div role="progressbar" aria-label={`Progresso de ${m.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentual} className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${percentual}%` }} />
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {concluida ? `Concluída em ${new Date(m.completed_at as string).toLocaleDateString('pt-BR')}` : m.status === 'em_andamento' ? 'Em andamento' : 'Não iniciada'}
                  </p>
                  {!concluida && m.tracking_type === 'manual' && (
                    <button type="button" onClick={() => concluirMeta(m.id)} className="mt-3 rounded-lg border border-indigo-300 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300">
                      Marcar como concluída
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

const CATALOGO_TOTAL = 8;

const CATALOGO: Record<string, { nome: string; descricao: string; categoria: string }> = {
  primeira_tarefa: { nome: 'Primeira tarefa', descricao: 'Concluir sua primeira atividade.', categoria: 'Primeiros passos' },
  primeiro_objetivo: { nome: 'Primeiro objetivo', descricao: 'Concluir sua primeira meta pessoal.', categoria: 'Primeiros passos' },
  tudo_em_dia: { nome: 'Tudo em dia', descricao: 'Não ter atividades atrasadas e ter concluído ao menos uma.', categoria: 'Organização' },
  pontualidade: { nome: 'Pontualidade', descricao: 'Concluir cinco atividades dentro do prazo.', categoria: 'Organização' },
  planejamento_inteligente: { nome: 'Planejamento inteligente', descricao: 'Concluir três metas pessoais.', categoria: 'Organização' },
  dez_atividades: { nome: 'Dez atividades', descricao: 'Concluir dez atividades.', categoria: 'Persistência' },
  explorador: { nome: 'Explorador', descricao: 'Concluir atividades de três matérias diferentes.', categoria: 'Aprendizado' },
  dedicacao_materia: { nome: 'Dedicação a uma matéria', descricao: 'Concluir cinco atividades de uma mesma matéria.', categoria: 'Aprendizado' },
};

function Cartao({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-600 dark:text-slate-400">{titulo}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{valor}</p>
    </div>
  );
}
