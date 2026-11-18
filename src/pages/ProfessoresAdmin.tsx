import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { inputClass } from './Login';
import { ANOS_FUND2, letraDaTurma } from './Turmas';

type Solicitacao = {
  id: string;
  user_id: string;
  full_name: string;
  subject: string;
  email_contact: string;
  years: number[];
  class_ids: string[];
  status: 'pendente' | 'aprovado' | 'rejeitado';
  admin_note: string | null;
  created_at: string;
};

type ProfessorAtual = {
  id: string;
  display_name: string;
  turmas: string[];
  materias: string[];
  email: string | null;
  desde: string;
};

type TurmaOpcao = { id: string; name: string; school_year: number };

export default function ProfessoresAdmin() {
  const { session } = useAuth();
  const [sols, setSols] = useState<Solicitacao[] | null>(null);
  const [profs, setProfs] = useState<ProfessorAtual[] | null>(null);
  const [turmas, setTurmas] = useState<TurmaOpcao[]>([]);
  const [filtro, setFiltro] = useState<'pendente' | 'aprovado' | 'rejeitado' | 'todos'>('pendente');
  const [editando, setEditando] = useState<Solicitacao | null>(null);
  const [fNome, setFNome] = useState('');
  const [fMateria, setFMateria] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fAnos, setFAnos] = useState<number[]>([]);
  const [fSalas, setFSalas] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    const [s, p, t, vinc] = await Promise.all([
      supabase.from('teacher_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, display_name, created_at').eq('role', 'teacher').order('display_name'),
      supabase.from('classes').select('id, name, school_year').eq('active', true).order('name'),
      supabase.from('teacher_classes').select('teacher_id, class_id, classes(name)'),
    ]);
    if (s.error) setMsg({ tipo: 'erro', texto: 'Não foi possível carregar as solicitações.' });
    setSols((s.data ?? []) as Solicitacao[]);
    setTurmas(((t.data ?? []) as TurmaOpcao[]).filter((x) => ANOS_FUND2.includes(x.school_year)));
    const mapaTurmas = new Map<string, string[]>();
    for (const v of (vinc.data ?? []) as unknown as { teacher_id: string; classes: { name: string } | { name: string }[] | null }[]) {
      const l = mapaTurmas.get(v.teacher_id) ?? [];
      const c = Array.isArray(v.classes) ? v.classes[0] : v.classes;
      if (c) l.push(c.name);
      mapaTurmas.set(v.teacher_id, l);
    }
    const mapaMat = new Map<string, { materias: string[]; email: string | null; desde: string }>();
    for (const r of (s.data ?? []) as Solicitacao[]) {
      if (r.status !== 'aprovado') continue;
      const cur = mapaMat.get(r.user_id) ?? { materias: [], email: r.email_contact, desde: r.created_at };
      if (!cur.materias.includes(r.subject)) cur.materias.push(r.subject);
      mapaMat.set(r.user_id, cur);
    }
    setProfs(
      ((p.data ?? []) as { id: string; display_name: string; created_at: string }[]).map((x) => ({
        id: x.id,
        display_name: x.display_name,
        turmas: mapaTurmas.get(x.id) ?? [],
        materias: mapaMat.get(x.id)?.materias ?? [],
        email: mapaMat.get(x.id)?.email ?? null,
        desde: x.created_at,
      })),
    );
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirEdicao(s: Solicitacao) {
    setEditando(s);
    setFNome(s.full_name);
    setFMateria(s.subject);
    setFEmail(s.email_contact);
    setFAnos([...(s.years ?? [])].sort());
    setFSalas(
      (s.class_ids ?? [])
        .map((id) => {
          const t = turmas.find((x) => x.id === id);
          return t ? `${t.school_year}${letraDaTurma(t.name)}` : null;
        })
        .filter((v): v is string => !!v),
    );
    setMsg(null);
  }

  function salasDisponiveis(anos: number[]) {
    return turmas
      .filter((t) => anos.includes(t.school_year))
      .map((t) => ({ key: `${t.school_year}${letraDaTurma(t.name)}`, id: t.id, nome: t.name, ano: t.school_year }))
      .sort((a, b) => a.ano - b.ano || a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async function salvarEdicao(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    if (fNome.trim().length < 3) {
      setMsg({ tipo: 'erro', texto: 'Informe o nome completo.' });
      return;
    }
    const ids = salasDisponiveis(fAnos)
      .filter((s) => fSalas.includes(s.key))
      .map((s) => s.id);
    setOcupado(true);
    const { error } = await supabase
      .from('teacher_requests')
      .update({
        full_name: fNome.trim(),
        subject: fMateria.trim() || editando.subject,
        email_contact: fEmail.trim() || editando.email_contact,
        years: fAnos,
        class_ids: ids,
      })
      .eq('id', editando.id);
    setOcupado(false);
    if (error) {
      setMsg({ tipo: 'erro', texto: 'Não foi possível salvar. Tente novamente.' });
      return;
    }
    setMsg({ tipo: 'ok', texto: 'Cadastro do professor atualizado.' });
    setEditando(null);
    void carregar();
  }

  async function aprovar(s: Solicitacao) {
    if (!window.confirm(`Aprovar ${s.full_name} (${s.subject})? Ele já poderá publicar nas salas escolhidas.`)) return;
    setOcupado(true);
    setMsg(null);
    try {
      // 1) vira professor
      const { error: e1 } = await supabase.from('profiles').update({ role: 'teacher' }).eq('id', s.user_id);
      if (e1) throw new Error('role');
      // 2) vincula salas
      if (s.class_ids.length > 0) {
        const { error: e2 } = await supabase
          .from('teacher_classes')
          .upsert(s.class_ids.map((class_id) => ({ teacher_id: s.user_id, class_id })), { onConflict: 'teacher_id,class_id' });
        if (e2) throw new Error('vinculo');
      }
      // 3) marca solicitação
      const { error: e3 } = await supabase
        .from('teacher_requests')
        .update({ status: 'aprovado', reviewed_at: new Date().toISOString(), reviewed_by: session?.user.id ?? null })
        .eq('id', s.id);
      if (e3) throw new Error('status');
      setMsg({ tipo: 'ok', texto: `${s.full_name} aprovado e já pode publicar.` });
    } catch {
      setMsg({ tipo: 'erro', texto: 'Não foi possível aprovar. Verifique sua permissão e tente de novo.' });
    } finally {
      setOcupado(false);
      void carregar();
    }
  }

  async function rejeitar(s: Solicitacao) {
    if (!window.confirm(`Rejeitar a solicitação de ${s.full_name}?`)) return;
    const { error } = await supabase
      .from('teacher_requests')
      .update({ status: 'rejeitado', reviewed_at: new Date().toISOString(), reviewed_by: session?.user.id ?? null })
      .eq('id', s.id);
    if (error) setMsg({ tipo: 'erro', texto: 'Não foi possível rejeitar.' });
    else setMsg({ tipo: 'ok', texto: 'Solicitação rejeitada.' });
    void carregar();
  }

  async function removerProfessor(p: ProfessorAtual) {
    if (!window.confirm(`Remover o acesso de professor de ${p.display_name}? Ele voltará a ser aluno.`)) return;
    const { error: e1 } = await supabase.from('teacher_classes').delete().eq('teacher_id', p.id);
    if (e1) {
      setMsg({ tipo: 'erro', texto: 'Não foi possível remover os vínculos.' });
      return;
    }
    const { error: e2 } = await supabase.from('profiles').update({ role: 'student' }).eq('id', p.id);
    if (e2) setMsg({ tipo: 'erro', texto: 'Não foi possível alterar o acesso.' });
    else setMsg({ tipo: 'ok', texto: 'Acesso de professor removido.' });
    void carregar();
  }

  const visiveis = (sols ?? []).filter((s) => (filtro === 'todos' ? true : s.status === filtro));
  const pendentes = (sols ?? []).filter((s) => s.status === 'pendente').length;

  return (
    <div className="space-y-6">
      {msg && (
        <p role={msg.tipo === 'erro' ? 'alert' : 'status'} className={msg.tipo === 'erro' ? 'rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200' : 'rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'}>
          {msg.texto}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="t-sols" className="rounded-2xl border border-slate-200 bg-white p-4 slide-painel dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="t-sols" className="font-bold">
              Solicitações {pendentes > 0 && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">{pendentes} pendente(s)</span>}
            </h2>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
              {(['pendente', 'aprovado', 'rejeitado', 'todos'] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f} className={`rounded-lg px-2.5 py-1.5 capitalize transition-all duration-200 ${filtro === f ? 'bg-white shadow dark:bg-slate-900' : 'text-slate-500'}`}>
                  {f === 'todos' ? 'Todas' : f + 's'}
                </button>
              ))}
            </div>
          </div>
          {sols === null ? (
            <div className="mt-3 h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" role="status" aria-label="Carregando solicitações" />
          ) : visiveis.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhuma solicitação aqui.</p>
          ) : (
            <ul key={filtro} className="mt-3 space-y-2 slide-painel">
              {visiveis.map((s, i) => (
                <li key={s.id} className="rounded-xl border border-slate-200 p-3 slide-item dark:border-slate-700" style={{ '--atraso': `${Math.min(i, 7) * 45}ms` } as CSSProperties}>
                  <p className="font-bold">{s.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {s.subject} · {s.email_contact} · {s.years.sort().map((a) => `${a}º`).join(', ')} · {(s.class_ids ?? []).length} sala(s)
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Pedido em {new Date(s.created_at).toLocaleDateString('pt-BR')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {s.status === 'pendente' && (
                      <>
                        <button type="button" disabled={ocupado} onClick={() => void aprovar(s)} className="min-h-10 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                          Aceitar
                        </button>
                        <button type="button" disabled={ocupado} onClick={() => void rejeitar(s)} className="min-h-10 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-600">
                          Rejeitar
                        </button>
                      </>
                    )}
                    <button type="button" onClick={() => abrirEdicao(s)} className="min-h-10 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-600">
                      Editar cadastro
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="t-atuais" className="rounded-2xl border border-slate-200 bg-white p-4 slide-painel dark:border-slate-800 dark:bg-slate-900">
          <h2 id="t-atuais" className="font-bold">Professores atuais ({profs?.length ?? 0})</h2>
          {profs === null ? (
            <div className="mt-3 h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" role="status" aria-label="Carregando professores" />
          ) : profs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhum professor aprovado ainda.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {profs.map((p, i) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 slide-item dark:border-slate-700" style={{ '--atraso': `${Math.min(i, 7) * 45}ms` } as CSSProperties}>
                  <div>
                    <p className="font-bold">{p.display_name}</p>
                    <p className="text-xs text-slate-500">
                      {[p.materias.join(', '), p.turmas.join(', ')].filter(Boolean).join(' · ') || 'Sem vínculo'}
                      {p.email ? ` · ${p.email}` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => void removerProfessor(p)} className="min-h-10 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-600">
                    Remover acesso
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editando && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={`Editar cadastro de ${editando.full_name}`}>
          <form onSubmit={salvarEdicao} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-5 shadow-2xl slide-modal dark:bg-slate-900" style={{ maxHeight: '88dvh', overflowY: 'auto' }}>
            <h2 className="text-lg font-bold">Editar cadastro · {editando.full_name}</h2>
            <div>
              <label htmlFor="ed-nome" className="mb-1 block text-sm font-semibold">Nome completo</label>
              <input id="ed-nome" value={fNome} onChange={(e) => setFNome(e.target.value)} maxLength={120} className={inputClass} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ed-mat" className="mb-1 block text-sm font-semibold">Matéria</label>
                <input id="ed-mat" value={fMateria} onChange={(e) => setFMateria(e.target.value)} maxLength={80} className={inputClass} />
              </div>
              <div>
                <label htmlFor="ed-email" className="mb-1 block text-sm font-semibold">E-mail</label>
                <input id="ed-email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} maxLength={160} className={inputClass} />
              </div>
            </div>
            <fieldset>
              <legend className="mb-1 text-sm font-semibold">Anos</legend>
              <div className="grid grid-cols-4 gap-2">
                {ANOS_FUND2.map((a) => (
                  <button key={a} type="button" onClick={() => setFAnos((at) => (at.includes(a) ? at.filter((x) => x !== a) : [...at, a].sort()))} aria-pressed={fAnos.includes(a)} className={`min-h-11 rounded-xl font-bold ${fAnos.includes(a) ? 'bg-indigo-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}>
                    {a}º
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-sm font-semibold">Salas</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {salasDisponiveis(fAnos).map((s) => (
                  <button key={s.key} type="button" onClick={() => setFSalas((at) => (at.includes(s.key) ? at.filter((x) => x !== s.key) : [...at, s.key]))} aria-pressed={fSalas.includes(s.key)} className={`min-h-11 rounded-xl px-2 text-sm font-bold ${fSalas.includes(s.key) ? 'bg-indigo-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}>
                    {s.nome}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex gap-2">
              <button type="submit" disabled={ocupado} className="min-h-11 flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                Salvar alterações
              </button>
              <button type="button" onClick={() => setEditando(null)} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 font-bold dark:border-slate-600">
                Fechar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
