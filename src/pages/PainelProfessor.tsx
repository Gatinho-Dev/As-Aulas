import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Bell, BookOpen, ClipboardCheck, FolderKanban, GraduationCap, Megaphone } from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { AtividadesAdmin, AvisosAdmin } from './Admin';

type TurmaDoProfessor = { id: string; name: string; school_year: number };
type Solic = { status: string; full_name: string | null };

const CHAVE_TURMA = 'turma-professor-selecionada';

export default function PainelProfessor() {
  const { session, profile, loading, signOut } = useAuth();
  const [turmas, setTurmas] = useState<TurmaDoProfessor[] | null>(null);
  const [solic, setSolic] = useState<Solic | null>(null);
  const [selecionada, setSelecionada] = useState<string>(() => localStorage.getItem(CHAVE_TURMA) ?? '');
  const [aba, setAba] = useState<'atividades' | 'avisos'>('atividades');
  const [erro, setErro] = useState<string | null>(null);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let ativo = true;
    (async () => {
      const [vinc, sol] = await Promise.all([
        supabase.from('teacher_classes').select('class_id, classes(id, name, school_year)').eq('teacher_id', userId),
        supabase.from('teacher_requests').select('status, full_name').eq('user_id', userId).maybeSingle(),
      ]);
      if (!ativo) return;
      if (vinc.error) {
        setErro('Não foi possível carregar suas turmas.');
        setTurmas([]);
        return;
      }
      const lista = ((vinc.data ?? []) as unknown as { classes: TurmaDoProfessor | TurmaDoProfessor[] | null }[])
        .map((v) => (Array.isArray(v.classes) ? v.classes[0] : v.classes))
        .filter((t): t is TurmaDoProfessor => !!t && typeof t.id === 'string')
        .sort((a, b) => a.school_year - b.school_year || a.name.localeCompare(b.name, 'pt-BR'));
      setTurmas(lista);
      setSolic((sol.data ?? null) as Solic | null);
      if (lista.length > 0) {
        setSelecionada((atual) => {
          if (atual && lista.some((t) => t.id === atual)) return atual;
          return lista[0].id;
        });
      }
    })();
    return () => {
      ativo = false;
    };
  }, [userId]);

  const turmaAtual = useMemo(() => turmas?.find((t) => t.id === selecionada) ?? null, [turmas, selecionada]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-slate-500" role="status">
        <ThinkingOrb state="connecting" size={32} />
        Carregando…
      </div>
    );
  }
  const idsTurmas = (turmas ?? []).map((t) => t.id);
  const nome = solic?.full_name ?? profile?.display_name ?? 'Professor(a)';
  if (!session) return <Navigate to="/professores" replace />;
  if (solic && solic.status === 'pendente' && profile?.role !== 'admin') {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 py-16 text-center sm:px-6">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <GraduationCap className="size-8" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Solicitação em análise</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Olá, {nome.split(' ')[0]}. A direção ainda não aprovou seu acesso. Entre de novo mais tarde com o mesmo e-mail e senha.</p>
        <button type="button" onClick={() => void signOut()} className="mt-6 min-h-11 rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-700">Sair</button>
      </main>
    );
  }
  if (solic && solic.status === 'rejeitado' && profile?.role !== 'admin') {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 py-16 text-center sm:px-6">
        <h1 className="mt-4 text-2xl font-bold">Solicitação não aprovada</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Sua solicitação de professor não foi aprovada. Fale com a direção da escola para entender o motivo.</p>
        <button type="button" onClick={() => void signOut()} className="mt-6 min-h-11 rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-700">Sair</button>
      </main>
    );
  }
  if (turmas === null) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-slate-500" role="status">
        <ThinkingOrb state="connecting" size={32} />
        Carregando suas salas…
      </div>
    );
  }
  if (profile && profile.role !== 'teacher' && profile.role !== 'admin') return <Navigate to="/" replace />;

  function escolher(id: string) {
    setSelecionada(id);
    localStorage.setItem(CHAVE_TURMA, id);
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5 sm:px-6">
    <header className="mb-4 flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 font-bold text-indigo-900 dark:text-white">
        <img src="/logo.png" alt="" aria-hidden="true" width={32} height={32} className="size-8 rounded-lg object-cover" />
        <span>As Aulas · Professor</span>
      </span>
      <button type="button" onClick={() => void signOut()} className="min-h-10 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-100 dark:border-slate-700">Sair</button>
    </header>
    <section aria-labelledby="titulo-prof" className="space-y-6">
      <div className="overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 p-6 text-white shadow-xl sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
          <GraduationCap className="size-4" aria-hidden />
          Painel do professor
        </p>
        <h1 id="titulo-prof" className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Olá, {nome.split(' ')[0]}. Para qual sala vamos publicar hoje?
        </h1>
        <p className="mt-1 text-sm text-indigo-50">
          Escolha a sala abaixo e use os formulários. Tudo sai publicado direto para os alunos daquela turma.
        </p>
      </div>

      {erro && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </p>
      )}

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Minhas salas</h2>
          <span className="text-xs text-slate-400">{turmas?.length ?? 0} sala(s)</span>
        </div>
        {turmas === null ? (
          <div className="mt-3 h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" role="status" aria-label="Carregando salas" />
        ) : turmas.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Nenhuma sala vinculada ainda. Fale com a direção para liberarem suas turmas.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {turmas.map((t) => {
              const ativa = t.id === selecionada;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => escolher(t.id)}
                  aria-pressed={ativa}
                  className={`flex min-h-12 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                    ativa
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                  }`}
                >
                  <BookOpen className="size-4" aria-hidden />
                  {t.name}
                </button>
              );
            })}
          </div>
        )}
        {turmaAtual && (
          <p className="mt-2 text-sm text-slate-500">
            Publicando em: <strong className="text-slate-800 dark:text-slate-100">{turmaAtual.name}</strong> · troque de
            sala quando quiser, só aparecem as suas.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icone: BookOpen, titulo: 'Lição de casa', texto: 'Tarefa rápida para a próxima aula.' },
          { icone: FolderKanban, titulo: 'Trabalho', texto: 'Pesquisa, cartaz ou grupo.' },
          { icone: ClipboardCheck, titulo: 'Prova', texto: 'Data, matéria e horário.' },
        ].map((c) => (
          <div
            key={c.titulo}
            className="flex items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <c.icone className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold">{c.titulo}</p>
              <p className="text-xs text-slate-500">{c.texto}</p>
            </div>
          </div>
        ))}
      </div>

      <div role="tablist" aria-label="O que publicar" className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
        {(
          [
            { id: 'atividades', label: 'Lições, trabalhos e provas', icone: ClipboardCheck },
            { id: 'avisos', label: 'Avisos da sala', icone: Megaphone },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={aba === t.id}
            onClick={() => setAba(t.id)}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
              aba === t.id ? 'bg-white text-indigo-900 shadow dark:bg-slate-900 dark:text-white' : 'text-slate-500'
            }`}
          >
            <t.icone className="size-4" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      {turmas !== null && turmas.length > 0 && userId && selecionada && (
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40 sm:p-4">
          {aba === 'atividades' ? (
            <AtividadesAdmin autorId={userId} turmaIds={idsTurmas} turmaFixa={selecionada} />
          ) : (
            <AvisosAdmin autorId={userId} turmaIds={idsTurmas} turmaFixa={selecionada} />
          )}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Bell className="size-4" aria-hidden />
        Os alunos da sala {turmaAtual?.name ?? 'selecionada'} recebem tudo na hora. Precisa de outra sala?{' '}
        <Link to="/professores" className="font-semibold text-indigo-600 hover:underline">
          Fale com a direção
        </Link>
        .
      </p>
    </section>
    </main>
  );
}
