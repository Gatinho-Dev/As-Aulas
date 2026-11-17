import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDateTime } from './assignmentUtils';

type Notificacao = {
  id: string;
  kind: string;
  title: string;
  message: string;
  link_path: string;
  created_at: string;
};

const TIPO_LABEL: Record<string, string> = {
  nova_atividade: 'Nova atividade',
  prova_proxima: 'Prova próxima',
  novo_aviso: 'Novo aviso',
  atividade_alterada: 'Atividade alterada',
  evento_importante: 'Evento',
};

export type PreferenciasNotificacao = {
  notif_avisos: boolean;
  notif_atividades: boolean;
  notif_eventos: boolean;
};

// Qual preferência do aluno controla cada tipo de notificação.
const CANAL_POR_TIPO: Record<string, keyof PreferenciasNotificacao> = {
  novo_aviso: 'notif_avisos',
  nova_atividade: 'notif_atividades',
  prova_proxima: 'notif_atividades',
  atividade_alterada: 'notif_atividades',
  evento_importante: 'notif_eventos',
};

export function tipoHabilitado(kind: string, prefs: PreferenciasNotificacao): boolean {
  const campo = CANAL_POR_TIPO[kind];
  return campo ? prefs[campo] : true;
}

async function carregarPreferencias(userId: string): Promise<PreferenciasNotificacao> {
  const { data } = await supabase
    .from('profiles')
    .select('notif_avisos, notif_atividades, notif_eventos')
    .eq('id', userId)
    .maybeSingle();
  const linha = data as Partial<PreferenciasNotificacao> | null;
  return {
    notif_avisos: linha?.notif_avisos ?? true,
    notif_atividades: linha?.notif_atividades ?? true,
    notif_eventos: linha?.notif_eventos ?? true,
  };
}

/** Quantidade de notificações habilitadas nas preferências que o usuário ainda não marcou como lidas. */
export async function loadUnreadCount(userId: string): Promise<number> {
  const [notif, reads, prefs] = await Promise.all([
    supabase.from('notifications').select('id, kind'),
    supabase.from('notification_reads').select('notification_id').eq('user_id', userId),
    carregarPreferencias(userId),
  ]);
  if (notif.error || reads.error) return 0;
  const lidas = new Set((reads.data ?? []).map((r) => r.notification_id as string));
  return (notif.data ?? []).filter(
    (n) => tipoHabilitado(n.kind as string, prefs) && !lidas.has(n.id as string),
  ).length;
}

export default function Notificacoes() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [itens, setItens] = useState<Notificacao[] | null>(null);
  const [lidas, setLidas] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!userId) return;
    const [notif, reads, prefs] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, kind, title, message, link_path, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('notification_reads').select('notification_id').eq('user_id', userId),
      carregarPreferencias(userId),
    ]);
    if (notif.error || reads.error) {
      setError('Não foi possível carregar as notificações. Verifique sua conexão e tente novamente.');
      setItens([]);
      return;
    }
    setError(null);
    setItens(((notif.data ?? []) as Notificacao[]).filter((n) => tipoHabilitado(n.kind, prefs)));
    setLidas(new Set((reads.data ?? []).map((r) => r.notification_id as string)));
  }, [userId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function marcarComoLidas(ids: string[]) {
    if (!userId || ids.length === 0) return;
    const { error: err } = await supabase.from('notification_reads').upsert(
      ids.map((notification_id) => ({ notification_id, user_id: userId })),
      { onConflict: 'notification_id,user_id', ignoreDuplicates: true },
    );
    if (err) {
      setError('Não foi possível marcar como lida. Tente novamente.');
      return;
    }
    setLidas((prev) => new Set([...prev, ...ids]));
  }

  if (itens === null) {
    return (
      <div className="space-y-3" role="status" aria-label="Carregando notificações">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  const naoLidas = itens.filter((n) => !lidas.has(n.id));

  return (
    <section aria-labelledby="titulo-notificacoes" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 id="titulo-notificacoes" className="text-2xl font-bold">
            Notificações
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {naoLidas.length === 0 ? 'Tudo em dia.' : `${naoLidas.length} não lida(s).`}
          </p>
        </div>
        {naoLidas.length > 0 && (
          <button
            type="button"
            onClick={() => void marcarComoLidas(naoLidas.map((n) => n.id))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {itens.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="font-medium">Você não tem notificações.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {itens.map((n) => {
            const lida = lidas.has(n.id);
            return (
              <li
                key={n.id}
                className={`rounded-xl border bg-white p-4 dark:bg-slate-900 ${
                  lida ? 'border-slate-200 dark:border-slate-800' : 'border-indigo-300 dark:border-indigo-800'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium dark:bg-slate-800">
                    {TIPO_LABEL[n.kind] ?? n.kind}
                  </span>
                  {!lida && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
                      Nova
                    </span>
                  )}
                  <span className="text-slate-500">{formatDateTime(n.created_at)}</span>
                </div>
                <h2 className="mt-2 font-semibold">{n.title}</h2>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{n.message}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <Link
                    to={n.link_path}
                    onClick={() => void marcarComoLidas([n.id])}
                    className="font-medium text-indigo-800 hover:underline dark:text-indigo-300"
                  >
                    Abrir
                  </Link>
                  {!lida && (
                    <button
                      type="button"
                      onClick={() => void marcarComoLidas([n.id])}
                      className="font-medium text-slate-600 hover:underline dark:text-slate-400"
                    >
                      Marcar como lida<span className="sr-only">: {n.title}</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
