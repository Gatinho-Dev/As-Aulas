import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ThinkingOrb } from 'thinking-orbs';
import { BorderBeam } from 'border-beam';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useTurmaPrincipal } from '../lib/useTurmaPrincipal';
import AutorConteudo from '../components/AutorConteudo';
import type { AutorResumo } from '../lib/pessoa';
import {
  TYPE_LABEL,
  TZ,
  addDays,
  dayKey,
  formatDateTime,
  loadAssignments,
  loadProgressMap,
  saveProgress,
  statusOf,
  type AssignmentRow,
  type ItemStatus,
  type Progress,
} from './assignmentUtils';

type EventRow = {
  id: string;
  title: string;
  category: string;
  starts_at: string;
  location: string | null;
  classes: { name: string } | null;
};

type AnnouncementRow = {
  id: string;
  title: string;
  category: string;
  importance: string;
  published_at: string;
  is_global?: boolean;
  autor?: AutorResumo | null;
  announcement_targets?: { class_id: string }[];
};

type Data = {
  assignments: AssignmentRow[];
  progress: Record<string, Progress>;
  events: EventRow[];
  announcements: AnnouncementRow[];
};

async function loadDashboard(): Promise<Data> {
  const [groups, progress, events, announcements] = await Promise.all([
    Promise.all([loadAssignments('licao_casa'), loadAssignments('trabalho'), loadAssignments('prova')]),
    loadProgressMap(),
            supabase
          .from('events')
          .select('id, title, category, starts_at, location, class_id, classes(name)')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(5),
            supabase
          .from('announcements')
          .select(
            'id, title, category, importance, published_at, is_global, autor:profiles!announcements_author_id_fkey(display_name, avatar_path, accent_color), announcement_targets(class_id)',
          )
      .eq('status', 'publicado')
      .order('published_at', { ascending: false })
      .limit(3),
  ]);
  if (events.error) throw new Error(events.error.message);
  if (announcements.error) throw new Error(announcements.error.message);
  return {
    assignments: groups.flat(),
    progress,
    events: (events.data ?? []) as unknown as EventRow[],
    announcements: (announcements.data ?? []) as unknown as AnnouncementRow[],
  };
}

export default function Dashboard() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [temTurma, setTemTurma] = useState<boolean | null>(null);
  const { principalId, principal, minhasTurmas } = useTurmaPrincipal();

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await loadDashboard());
    } catch {
      setError('Não foi possível carregar o painel. Verifique sua conexão e tente novamente.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void supabase
      .from('class_memberships')
      .select('class_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('membership_status', 'ativo')
      .then(({ count }) => {
        if (active) setTemTurma((count ?? 0) > 0);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  async function toggle(item: AssignmentRow) {
    if (!userId || !data) return;
    const concluida = data.progress[item.id]?.personal_status === 'concluida';
    setPendingId(item.id);
    const err = await saveProgress(item.id, userId, concluida ? 'pendente' : 'concluida');
    setPendingId(null);
    if (err) {
      setError('Não foi possível salvar sua alteração. Tente novamente.');
      return;
    }
    await load();
  }

  const dadosFiltrados = useMemo(() => {
    if (!data) return null;
    if (!principalId || (minhasTurmas ?? []).length <= 1) return data;
    return {
      ...data,
      assignments: data.assignments.filter((a) => !a.class_id || a.class_id === principalId),
      events: data.events.filter((e) => !(e as unknown as { class_id?: string | null }).class_id || (e as unknown as { class_id?: string | null }).class_id === principalId),
      announcements: data.announcements.filter(
        (a) => a.is_global || (a.announcement_targets ?? []).some((t) => t.class_id === principalId),
      ),
    };
  }, [data, principalId, minhasTurmas]);

  const view = useMemo(() => (dadosFiltrados ? buildView(dadosFiltrados) : null), [dadosFiltrados]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => void load()} className="mt-3 font-semibold underline">
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!data || !view) {
    return (
      <div className="space-y-4" role="status" aria-label="Carregando painel">
        <div className="flex h-16 items-center justify-center">
          <ThinkingOrb state="working" size={64} />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  const nome = profile?.display_name?.split(' ')[0] ?? 'aluno';
  const hoje = new Date().toLocaleDateString('pt-BR', {
    timeZone: TZ,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-8">
      <header data-tutorial="inicio">
        <h1 className="text-2xl font-bold">Olá, {nome}! 👋</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Vamos organizar seus estudos?</p>
        <p className="mt-1 text-sm capitalize text-slate-500">{hoje}</p>
      </header>

      {profile?.role !== 'admin' && principal && (minhasTurmas ?? []).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900" role="status">
          <p>
            Mostrando o conteúdo da turma principal <strong>{principal.name}</strong>.{' '}
            <Link to="/turmas" className="font-medium text-indigo-800 hover:underline dark:text-indigo-300">
              Trocar turma principal
            </Link>
          </p>
        </div>
      )}

      {profile?.role !== 'admin' && temTurma === false && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950" role="status">
          <p className="font-medium text-indigo-900 dark:text-indigo-100">Você ainda não está em nenhuma turma.</p>
          <p className="mt-1 text-sm text-indigo-800 dark:text-indigo-200">
            Escolha a sua turma para ver lições, provas, avisos e horários dela.
          </p>
          <Link
            to="/bem-vindo"
            className="mt-3 inline-block rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
          >
            Escolher minha turma
          </Link>
        </div>
      )}

      <section aria-labelledby="estatisticas" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <h2 id="estatisticas" className="sr-only">
          Estatísticas
        </h2>
        <Stat label="Tarefas pendentes" value={view.pendentes} />
        <Stat label="Tarefas concluídas" value={view.concluidas} />
        <Stat label="Trabalhos em andamento" value={view.trabalhosEmAndamento} />
        <Stat label="Próximas provas" value={view.proximasProvas.length} />
        <Stat label="Atividades atrasadas" value={view.atrasadas} tone={view.atrasadas > 0 ? 'danger' : undefined} />
        <Stat
          label="Próximo evento"
          value={view.proximoEvento ? formatDateTime(view.proximoEvento.starts_at).slice(0, 5) : '—'}
          hint={view.proximoEvento?.title}
        />
      </section>

      <div data-tutorial="atividades">
      <Secao titulo="Para hoje">
        {view.hoje.length === 0 ? (
          <Vazio texto="Nenhuma atividade vence hoje." />
        ) : (
          <ul className="space-y-2">
            {view.hoje.map((item) => (
              <ItemAtividade
                key={item.id}
                item={item}
                concluida={data.progress[item.id]?.personal_status === 'concluida'}
                pending={pendingId === item.id}
                onToggle={() => void toggle(item)}
              />
            ))}
          </ul>
        )}
      </Secao>

      </div>

      <Secao titulo="Próximos prazos (7 dias)">
        {view.proximos.length === 0 ? (
          <Vazio texto="Nenhum prazo nos próximos sete dias." />
        ) : (
          <ul className="space-y-2">
            {view.proximos.map((item) => (
              <ItemAtividade
                key={item.id}
                item={item}
                concluida={data.progress[item.id]?.personal_status === 'concluida'}
                pending={pendingId === item.id}
                onToggle={() => void toggle(item)}
              />
            ))}
          </ul>
        )}
      </Secao>

      <div className="grid gap-8 md:grid-cols-2">
        <Secao titulo="Próximas provas">
          {view.proximasProvas.length === 0 ? (
            <Vazio texto="Nenhuma prova próxima." />
          ) : (
            <ul className="space-y-2">
              {view.proximasProvas.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/provas/${p.id}`}
                    className="block rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                  >
                    <span className="font-medium">{p.title}</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-400">
                      {p.subjects?.name} · {formatDateTime(p.due_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <div data-tutorial="datas">
          <Secao titulo="Calendário resumido">
          {data.events.length === 0 ? (
            <Vazio texto="Sua agenda está livre por enquanto." />
          ) : (
            <ul className="space-y-2">
              {data.events.map((e) => (
                <li key={e.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  <span className="font-medium">{e.title}</span>
                  <span className="block text-sm text-slate-600 dark:text-slate-400">
                    {formatDateTime(e.starts_at)}
                    {e.classes?.name ? ` · ${e.classes.name}` : ''}
                    {e.location ? ` · ${e.location}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          </Secao>
        </div>
      </div>

      <Secao titulo="Avisos recentes">
        {data.announcements.length === 0 ? (
          <Vazio texto="Ainda não há avisos publicados." />
        ) : (
          <ul className="space-y-2">
            {data.announcements.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <span className="font-medium">{a.title}</span>
                <span className="block text-sm text-slate-600 dark:text-slate-400">{formatDateTime(a.published_at)}</span>
                <AutorConteudo autor={a.autor} className="mt-1" />
              </li>
            ))}
          </ul>
        )}
        <Link to="/avisos" className="mt-2 inline-block text-sm font-medium text-indigo-800 hover:underline dark:text-indigo-300">
          Ver todos os avisos
        </Link>
      </Secao>

      <Secao titulo="Progresso da semana">
        {view.semana.total === 0 ? (
          <Vazio texto="O progresso aparecerá quando as atividades começarem a ser registradas nesta semana." />
        ) : (
          <div className="space-y-2" aria-label="Atividades da semana por dia">
            {view.semana.dias.map((d) => (
              <div key={d.key} className="grid grid-cols-[3rem_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="text-slate-600 dark:text-slate-400">{d.label}</span>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="bg-emerald-600" style={{ width: `${(d.concluidas / view.semana.max) * 100}%` }} title={`${d.concluidas} concluídas`} />
                  <div className="bg-amber-500" style={{ width: `${(d.pendentes / view.semana.max) * 100}%` }} title={`${d.pendentes} pendentes`} />
                </div>
                <span className="text-right text-slate-600 dark:text-slate-400">{d.concluidas + d.pendentes}</span>
              </div>
            ))}
            <p className="flex gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-emerald-600" aria-hidden="true" />
                Concluídas
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-amber-500" aria-hidden="true" />
                Pendentes
              </span>
            </p>
          </div>
        )}
      </Secao>
    </div>
  );
}

function buildView(data: Data) {
  const today = dayKey(new Date());
  const now = Date.now();

  const withStatus = data.assignments.map((a) => ({
    ...a,
    estado: statusOf(a.due_at, data.progress[a.id]?.personal_status),
  }));

  const pendentes = withStatus.filter((a) => a.estado !== 'concluida').length;
  const concluidas = withStatus.filter((a) => a.estado === 'concluida').length;
  const atrasadas = withStatus.filter((a) => a.estado === 'atrasada').length;
  const trabalhosEmAndamento = withStatus.filter(
    (a) => a.type === 'trabalho' && data.progress[a.id]?.personal_status === 'em_andamento',
  ).length;
  const proximasProvas = withStatus.filter((a) => a.type === 'prova' && new Date(a.due_at).getTime() >= now);

  const hoje = withStatus.filter((a) => dayKey(a.due_at) === today);
  const proximos = withStatus
    .filter((a) => {
      const t = new Date(a.due_at).getTime();
      return t >= now && t <= now + 7 * 86_400_000 && dayKey(a.due_at) !== today;
    })
    .sort((a, b) => a.due_at.localeCompare(b.due_at));

  // Semana (segunda a domingo) no fuso de São Paulo, agrupando pelo prazo.
  const weekdayIdx = new Date(`${today}T12:00:00Z`).getUTCDay();
  const monday = addDays(today, -((weekdayIdx + 6) % 7));
  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const dias = labels.map((label, i) => {
    const key = addDays(monday, i);
    const doDia = withStatus.filter((a) => dayKey(a.due_at) === key);
    return {
      key,
      label,
      concluidas: doDia.filter((a) => a.estado === 'concluida').length,
      pendentes: doDia.filter((a) => a.estado !== 'concluida').length,
    };
  });
  const total = dias.reduce((s, d) => s + d.concluidas + d.pendentes, 0);
  const max = Math.max(1, ...dias.map((d) => d.concluidas + d.pendentes));

  return {
    pendentes,
    concluidas,
    atrasadas,
    trabalhosEmAndamento,
    proximasProvas,
    hoje,
    proximos,
    semana: { dias, total, max },
    proximoEvento: data.events[0] ?? null,
  };
}

type ItemView = AssignmentRow & { estado: ItemStatus };

function caminhoDe(item: AssignmentRow): string {
  const secao = item.type === 'licao_casa' ? 'licoes' : item.type === 'trabalho' ? 'trabalhos' : 'provas';
  return `/${secao}/${item.id}`;
}

function ItemAtividade({
  item,
  concluida,
  pending,
  onToggle,
}: {
  item: ItemView;
  concluida: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  const rotulo = item.estado === 'concluida' ? 'Concluída' : item.estado === 'atrasada' ? 'Atrasada' : 'Pendente';
  const cor =
    item.estado === 'atrasada' ? 'text-red-600' : item.estado === 'concluida' ? 'text-emerald-600' : 'text-amber-600';
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
      <div className="min-w-0">
        <Link to={caminhoDe(item)} className="font-semibold text-indigo-800 hover:underline dark:text-indigo-300">
          {item.title}
        </Link>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          <span className="inline-block size-2.5 rounded-full align-middle" style={{ backgroundColor: item.subjects?.color }} aria-hidden="true" />{' '}
          {item.subjects?.name} · {item.classes?.name} · {TYPE_LABEL[item.type]} · Prazo: {formatDateTime(item.due_at)}
        </p>
        <p className={`mt-1 text-xs font-medium uppercase tracking-wide ${cor}`}>{rotulo}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className="shrink-0 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
      >
        {concluida ? 'Desfazer conclusão' : 'Marcar como concluída'}
      </button>
    </li>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: number | string; hint?: string; tone?: 'danger' }) {
  return (
    <BorderBeam className="rounded-xl" colorVariant="ocean" theme="auto">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${tone === 'danger' ? 'text-red-600' : ''}`}>{value}</p>
        {hint && <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>}
      </div>
    </BorderBeam>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo}>
      <h2 className="mb-3 text-lg font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
      {texto}
    </p>
  );
}
