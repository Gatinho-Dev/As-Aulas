import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDateTime, TYPE_LABEL, type AssignmentType } from './assignmentUtils';
import { inputClass } from './Login';
import { anoLabel, TURNO_LABEL } from './Turmas';
import ProfessoresAdmin from './ProfessoresAdmin';

type Aba = 'turmas' | 'disciplinas' | 'representantes' | 'atividades' | 'avisos' | 'professores';

const ABAS: { id: Aba; label: string }[] = [
  { id: 'turmas', label: 'Turmas' },
  { id: 'disciplinas', label: 'Disciplinas' },
  { id: 'representantes', label: 'Representantes' },
  { id: 'atividades', label: 'Atividades' },
  { id: 'avisos', label: 'Avisos' },
  { id: 'professores', label: 'Professores' },
];

const CATEGORIAS_AVISO: Record<string, string> = {
  geral: 'Geral',
  tarefa: 'Tarefa',
  prova: 'Prova',
  trabalho: 'Trabalho',
  evento: 'Evento',
  alteracao_horario: 'Alteração de horário',
  comunicado_importante: 'Comunicado importante',
};

const IMPORTANCIA_AVISO: Record<string, string> = { normal: 'Normal', importante: 'Importante', urgente: 'Urgente' };

type Erros = Record<string, string>;

type TurmaAdmin = { id: string; name: string; school_year: number; shift: string | null; description: string | null; active: boolean };
type DisciplinaAdmin = { id: string; name: string; color: string; description: string | null; active: boolean };
type Vinculo = { class_id: string; subject_id: string; teacher_name: string | null; classes: { name: string } | null; subjects: { name: string } | null };
type AtividadeAdmin = { id: string; type: AssignmentType; title: string; due_at: string; status: string; classes: { name: string } | null; subjects: { name: string } | null };
type AvisoAdmin = { id: string; title: string; category: string; importance: string; status: string; published_at: string | null; is_global: boolean; announcement_targets: { class_id: string }[] };
type PerfilResumo = { display_name: string; username: string | null } | null;
type RepAdmin = { class_id: string; user_id: string; classes: { name: string } | null; profiles: PerfilResumo };
type MembroTurma = { user_id: string; profiles: PerfilResumo };

function mensagemErro(e: { message: string } | null): string {
  if (!e) return 'Não foi possível salvar. Tente novamente.';
  if (/row-level security|permission denied/i.test(e.message)) return 'Você não tem permissão para esta ação.';
  if (/duplicate key|unique/i.test(e.message)) return 'Já existe um cadastro com este nome.';
  if (/fetch|network|Failed/i.test(e.message)) return 'Erro de conexão. Verifique sua internet e tente novamente.';
  return 'Não foi possível salvar. Verifique os dados e tente novamente.';
}

function Campo({ id, label, erro, children }: { id: string; label: string; erro?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label} <span aria-hidden="true" className="text-red-700">*</span>
      </label>
      {children}
      {erro && (
        <p id={`${id}-erro`} className="mt-1 text-sm text-red-700 dark:text-red-300">
          {erro}
        </p>
      )}
    </div>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{children}</p>;
}

function Sucesso({ children }: { children: ReactNode }) {
  return <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{children}</p>;
}

export default function Admin() {
  const { profile, session } = useAuth();
  const [aba, setAba] = useState<Aba>('turmas');

  if (!profile) return <p role="status">Carregando…</p>;
  if (profile.role !== 'admin') {
    return <p className="font-medium">Esta área é restrita a administradores.</p>;
  }

  const autorId = session?.user.id ?? '';

  return (
    <section aria-labelledby="titulo-admin" className="space-y-6">
      <div>
        <h1 id="titulo-admin" className="text-2xl font-bold">
          Painel administrativo
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Gerencie turmas, disciplinas, atividades e avisos.</p>
      </div>

      <div role="tablist" aria-label="Seções do painel" className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            type="button"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              aba === a.id
                ? 'border-indigo-700 text-indigo-900 dark:border-indigo-300 dark:text-indigo-200'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'turmas' && <TurmasAdmin />}
      {aba === 'disciplinas' && <DisciplinasAdmin />}
      {aba === 'representantes' && <RepresentantesAdmin />}
      {aba === 'atividades' && <AtividadesAdmin autorId={autorId} />}
      {aba === 'avisos' && <AvisosAdmin autorId={autorId} />}
      {aba === 'professores' && <ProfessoresAdmin />}
    </section>
  );
}

/* ---------------- Turmas ---------------- */

function TurmasAdmin() {
  const [turmas, setTurmas] = useState<TurmaAdmin[] | null>(null);
  const [editando, setEditando] = useState<TurmaAdmin | null>(null);
  const [nome, setNome] = useState('');
  const [ano, setAno] = useState('1');
  const [turno, setTurno] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  async function carregar() {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, school_year, shift, description, active')
      .order('name', { ascending: true });
    if (error) setMsg({ tipo: 'erro', texto: 'Não foi possível carregar as turmas.' });
    setTurmas((data ?? []) as TurmaAdmin[]);
  }

  useEffect(() => {
    void carregar();
  }, []);

  function limpar() {
    setEditando(null);
    setNome('');
    setAno('1');
    setTurno('');
    setDescricao('');
    setErros({});
  }

  function editar(t: TurmaAdmin) {
    setEditando(t);
    setNome(t.name);
    setAno(String(t.school_year));
    setTurno(t.shift ?? '');
    setDescricao(t.description ?? '');
    setErros({});
    setMsg(null);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const novosErros: Erros = {};
    if (!nome.trim()) novosErros.nome = 'Informe o nome da turma.';
    if (!ano || Number(ano) < 1 || Number(ano) > 12) novosErros.ano = 'Escolha um ano entre 1 e 12.';
    setErros(novosErros);
    if (Object.keys(novosErros).length) return;

    const dados = {
      name: nome.trim(),
      school_year: Number(ano),
      shift: turno || null,
      description: descricao.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = editando
      ? await supabase.from('classes').update(dados).eq('id', editando.id)
      : await supabase.from('classes').insert(dados);
    if (error) {
      setMsg({ tipo: 'erro', texto: mensagemErro(error) });
      return;
    }
    setMsg({ tipo: 'ok', texto: editando ? 'Turma atualizada.' : 'Turma cadastrada.' });
    limpar();
    void carregar();
  }

  async function alternarAtiva(t: TurmaAdmin) {
    const acao = t.active ? 'desativar' : 'reativar';
    if (t.active && !window.confirm(`Desativar a turma "${t.name}"? Os alunos deixarão de vê-la, mas os dados serão mantidos.`)) return;
    const { error } = await supabase.from('classes').update({ active: !t.active, updated_at: new Date().toISOString() }).eq('id', t.id);
    if (error) setMsg({ tipo: 'erro', texto: `Não foi possível ${acao} a turma.` });
    else setMsg({ tipo: 'ok', texto: `Turma ${t.active ? 'desativada' : 'reativada'}.` });
    void carregar();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-3">
        <h2 className="font-semibold">Turmas cadastradas</h2>
        {msg && (msg.tipo === 'erro' ? <Aviso>{msg.texto}</Aviso> : <Sucesso>{msg.texto}</Sucesso>)}
        {turmas === null ? (
          <div className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" role="status" aria-label="Carregando turmas" />
        ) : turmas.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Nenhuma turma cadastrada.</p>
        ) : (
          <ul className="space-y-2">
            {turmas.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="font-medium">
                    {t.name} {!t.active && <span className="text-xs text-slate-500">(inativa)</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {anoLabel(t.school_year)}
                    {t.shift ? ` · ${TURNO_LABEL[t.shift]}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => editar(t)} className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                    Editar <span className="sr-only">turma {t.name}</span>
                  </button>
                  <button type="button" onClick={() => void alternarAtiva(t)} className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                    {t.active ? 'Desativar' : 'Reativar'} <span className="sr-only">turma {t.name}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={salvar} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="form-turma">
        <h2 id="form-turma" className="font-semibold">{editando ? 'Editar turma' : 'Nova turma'}</h2>
        <Campo id="turma-nome" label="Nome" erro={erros.nome}>
          <input id="turma-nome" value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} aria-invalid={!!erros.nome} aria-describedby={erros.nome ? 'turma-nome-erro' : undefined} />
        </Campo>
        <Campo id="turma-ano" label="Ano" erro={erros.ano}>
          <select id="turma-ano" value={ano} onChange={(e) => setAno(e.target.value)} className={inputClass}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{anoLabel(i + 1)}</option>
            ))}
          </select>
        </Campo>
        <div>
          <label htmlFor="turma-turno" className="mb-1 block text-sm font-medium">Turno</label>
          <select id="turma-turno" value={turno} onChange={(e) => setTurno(e.target.value)} className={inputClass}>
            <option value="">Não definido</option>
            {Object.entries(TURNO_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="turma-desc" className="mb-1 block text-sm font-medium">Descrição</label>
          <textarea id="turma-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} maxLength={500} className={inputClass} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800">
            {editando ? 'Salvar alterações' : 'Cadastrar turma'}
          </button>
          {editando && (
            <button type="button" onClick={limpar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/* ---------------- Disciplinas ---------------- */

function DisciplinasAdmin() {
  const [disciplinas, setDisciplinas] = useState<DisciplinaAdmin[] | null>(null);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [turmas, setTurmas] = useState<TurmaAdmin[]>([]);
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#3563E9');
  const [descricao, setDescricao] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [disciplinaId, setDisciplinaId] = useState('');
  const [professor, setProfessor] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  async function carregar() {
    const [d, v, t] = await Promise.all([
      supabase.from('subjects').select('id, name, color, description, active').order('name'),
      supabase.from('class_subjects').select('class_id, subject_id, teacher_name, classes(name), subjects(name)'),
      supabase.from('classes').select('id, name, school_year, shift, description, active').order('name'),
    ]);
    if (d.error || v.error || t.error) setMsg({ tipo: 'erro', texto: 'Não foi possível carregar as disciplinas.' });
    setDisciplinas((d.data ?? []) as DisciplinaAdmin[]);
    setVinculos((v.data ?? []) as unknown as Vinculo[]);
    setTurmas((t.data ?? []) as TurmaAdmin[]);
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function criarDisciplina(e: FormEvent) {
    e.preventDefault();
    const novos: Erros = {};
    if (!nome.trim()) novos.nome = 'Informe o nome da disciplina.';
    if (!/^#[0-9A-Fa-f]{6}$/.test(cor)) novos.cor = 'Escolha uma cor válida.';
    setErros(novos);
    if (Object.keys(novos).length) return;
    const { error } = await supabase.from('subjects').insert({ name: nome.trim(), color: cor, description: descricao.trim() || null });
    if (error) {
      setMsg({ tipo: 'erro', texto: mensagemErro(error) });
      return;
    }
    setNome('');
    setDescricao('');
    setMsg({ tipo: 'ok', texto: 'Disciplina cadastrada.' });
    void carregar();
  }

  async function vincular(e: FormEvent) {
    e.preventDefault();
    const novos: Erros = {};
    if (!turmaId) novos.turma = 'Escolha a turma.';
    if (!disciplinaId) novos.disciplina = 'Escolha a disciplina.';
    setErros(novos);
    if (Object.keys(novos).length) return;
    const { error } = await supabase.from('class_subjects').insert({
      class_id: turmaId,
      subject_id: disciplinaId,
      teacher_name: professor.trim() || null,
    });
    if (error) {
      setMsg({ tipo: 'erro', texto: mensagemErro(error) });
      return;
    }
    setProfessor('');
    setMsg({ tipo: 'ok', texto: 'Disciplina vinculada à turma.' });
    void carregar();
  }

  async function desvincular(v: Vinculo) {
    if (!window.confirm(`Remover "${v.subjects?.name}" da turma "${v.classes?.name}"?`)) return;
    const { error } = await supabase.from('class_subjects').delete().eq('class_id', v.class_id).eq('subject_id', v.subject_id);
    if (error) setMsg({ tipo: 'erro', texto: 'Não foi possível remover o vínculo. Ele pode estar em uso por atividades.' });
    else setMsg({ tipo: 'ok', texto: 'Vínculo removido.' });
    void carregar();
  }

  return (
    <div className="space-y-6">
      {msg && (msg.tipo === 'erro' ? <Aviso>{msg.texto}</Aviso> : <Sucesso>{msg.texto}</Sucesso>)}

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={criarDisciplina} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="form-disc">
          <h2 id="form-disc" className="font-semibold">Nova disciplina</h2>
          <Campo id="disc-nome" label="Nome" erro={erros.nome}>
            <input id="disc-nome" value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} aria-invalid={!!erros.nome} />
          </Campo>
          <Campo id="disc-cor" label="Cor" erro={erros.cor}>
            <input id="disc-cor" type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-10 w-20 rounded-lg border border-slate-300 dark:border-slate-700" />
          </Campo>
          <div>
            <label htmlFor="disc-desc" className="mb-1 block text-sm font-medium">Descrição</label>
            <textarea id="disc-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} maxLength={500} className={inputClass} />
          </div>
          <button type="submit" className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800">Cadastrar disciplina</button>
        </form>

        <form onSubmit={vincular} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="form-vinc">
          <h2 id="form-vinc" className="font-semibold">Vincular disciplina a uma turma</h2>
          <Campo id="vinc-turma" label="Turma" erro={erros.turma}>
            <select id="vinc-turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className={inputClass}>
              <option value="">Escolha…</option>
              {turmas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Campo>
          <Campo id="vinc-disc" label="Disciplina" erro={erros.disciplina}>
            <select id="vinc-disc" value={disciplinaId} onChange={(e) => setDisciplinaId(e.target.value)} className={inputClass}>
              <option value="">Escolha…</option>
              {(disciplinas ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Campo>
          <div>
            <label htmlFor="vinc-prof" className="mb-1 block text-sm font-medium">Professor(a)</label>
            <input id="vinc-prof" value={professor} onChange={(e) => setProfessor(e.target.value)} maxLength={80} className={inputClass} />
          </div>
          <button type="submit" className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800">Vincular</button>
        </form>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Vínculos atuais</h2>
        {vinculos.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum vínculo cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {vinculos.map((v) => (
              <li key={`${v.class_id}-${v.subject_id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                <span>
                  <strong>{v.subjects?.name}</strong> · {v.classes?.name}
                  {v.teacher_name ? ` · ${v.teacher_name}` : ''}
                </span>
                <button type="button" onClick={() => void desvincular(v)} className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                  Remover <span className="sr-only">{v.subjects?.name} da turma {v.classes?.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------- Atividades ---------------- */

export function AtividadesAdmin({ autorId, turmaIds, turmaFixa }: { autorId: string; turmaIds?: string[]; turmaFixa?: string }) {
  const [atividades, setAtividades] = useState<AtividadeAdmin[] | null>(null);
  const [turmas, setTurmas] = useState<TurmaAdmin[]>([]);
  const [disciplinas, setDisciplinas] = useState<DisciplinaAdmin[]>([]);
  const [tipo, setTipo] = useState<AssignmentType>('licao_casa');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [turmaId, setTurmaId] = useState('');
  const [disciplinaId, setDisciplinaId] = useState('');
  const [prazo, setPrazo] = useState('');
  const [publicar, setPublicar] = useState(true);
  const [erros, setErros] = useState<Erros>({});
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  async function carregar() {
    const baseAtividades = supabase.from('assignments').select('id, type, title, due_at, status, classes(name), subjects(name)').order('due_at', { ascending: false });
    const baseTurmas = supabase.from('classes').select('id, name, school_year, shift, description, active').eq('active', true).order('name');
    const [a, t, d] = await Promise.all([
      turmaIds ? baseAtividades.in('class_id', turmaIds) : baseAtividades,
      turmaIds ? baseTurmas.in('id', turmaIds) : baseTurmas,
      supabase.from('subjects').select('id, name, color, description, active').eq('active', true).order('name'),
    ]);
    if (a.error) setMsg({ tipo: 'erro', texto: 'Não foi possível carregar as atividades.' });
    setAtividades((a.data ?? []) as unknown as AtividadeAdmin[]);
    setTurmas((t.data ?? []) as TurmaAdmin[]);
    setDisciplinas((d.data ?? []) as DisciplinaAdmin[]);
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const novos: Erros = {};
    if (!titulo.trim()) novos.titulo = 'Informe o título.';
    const turmaDestino = turmaFixa ?? turmaId;
    if (!turmaDestino) novos.turma = 'Escolha a turma.';
    if (!disciplinaId) novos.disciplina = 'Escolha a disciplina.';
    if (!prazo) novos.prazo = 'Informe o prazo de entrega.';
    else if (publicar && new Date(prazo).getTime() < Date.now()) novos.prazo = 'Um item publicado precisa de prazo futuro.';
    setErros(novos);
    if (Object.keys(novos).length) return;

    const agora = new Date().toISOString();
    const { error } = await supabase.from('assignments').insert({
      type: tipo,
      title: titulo.trim(),
      description: descricao.trim() || null,
      class_id: turmaDestino,
      subject_id: disciplinaId,
      due_at: new Date(prazo).toISOString(),
      status: publicar ? 'publicada' : 'rascunho',
      published_at: publicar ? agora : null,
      created_by: autorId,
    });
    if (error) {
      setMsg({ tipo: 'erro', texto: mensagemErro(error) });
      return;
    }
    setTitulo('');
    setDescricao('');
    setPrazo('');
    setMsg({ tipo: 'ok', texto: publicar ? `${TYPE_LABEL[tipo]} publicada para a turma.` : `${TYPE_LABEL[tipo]} salva como rascunho.` });
    void carregar();
  }

  async function alterarStatus(a: AtividadeAdmin, status: 'publicada' | 'arquivada') {
    const atualiza: Record<string, string | null> = { status, updated_at: new Date().toISOString() };
    if (status === 'publicada') atualiza.published_at = new Date().toISOString();
    const { error } = await supabase.from('assignments').update(atualiza).eq('id', a.id);
    if (error) setMsg({ tipo: 'erro', texto: 'Não foi possível alterar o status. Verifique se o prazo ainda é futuro.' });
    else setMsg({ tipo: 'ok', texto: status === 'publicada' ? 'Atividade publicada.' : 'Atividade arquivada.' });
    void carregar();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-3">
        <h2 className="font-semibold">Atividades</h2>
        {msg && (msg.tipo === 'erro' ? <Aviso>{msg.texto}</Aviso> : <Sucesso>{msg.texto}</Sucesso>)}
        {atividades === null ? (
          <div className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" role="status" aria-label="Carregando atividades" />
        ) : atividades.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Nenhuma atividade cadastrada.</p>
        ) : (
          <ul className="space-y-2">
            {atividades.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.title}</p>
                  <p className="text-xs text-slate-500">
                    {TYPE_LABEL[a.type]} · {a.subjects?.name} · {a.classes?.name} · prazo {formatDateTime(a.due_at)} · {a.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  {a.status !== 'publicada' && (
                    <button type="button" onClick={() => void alterarStatus(a, 'publicada')} className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                      Publicar <span className="sr-only">{a.title}</span>
                    </button>
                  )}
                  {a.status !== 'arquivada' && (
                    <button type="button" onClick={() => void alterarStatus(a, 'arquivada')} className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                      Arquivar <span className="sr-only">{a.title}</span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={salvar} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="form-ativ">
        <h2 id="form-ativ" className="font-semibold">Nova atividade</h2>
        <div>
          <label htmlFor="ativ-tipo" className="mb-1 block text-sm font-medium">Tipo</label>
          <select id="ativ-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as AssignmentType)} className={inputClass}>
            {(Object.keys(TYPE_LABEL) as AssignmentType[]).map((k) => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}
          </select>
        </div>
        <Campo id="ativ-titulo" label="Título" erro={erros.titulo}>
          <input id="ativ-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={150} className={inputClass} aria-invalid={!!erros.titulo} />
        </Campo>
        {turmaFixa ? (
          <p className="rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
            Publicando em: {turmas.find((t) => t.id === turmaFixa)?.name ?? 'sala selecionada'}
          </p>
        ) : (
          <Campo id="ativ-turma" label="Turma" erro={erros.turma}>
            <select id="ativ-turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className={inputClass}>
              <option value="">Escolha…</option>
              {turmas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Campo>
        )}
        <Campo id="ativ-disc" label="Disciplina" erro={erros.disciplina}>
          <select id="ativ-disc" value={disciplinaId} onChange={(e) => setDisciplinaId(e.target.value)} className={inputClass}>
            <option value="">Escolha…</option>
            {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Campo>
        <Campo id="ativ-prazo" label="Prazo" erro={erros.prazo}>
          <input id="ativ-prazo" type="datetime-local" value={prazo} onChange={(e) => setPrazo(e.target.value)} className={inputClass} aria-invalid={!!erros.prazo} />
        </Campo>
        <div>
          <label htmlFor="ativ-desc" className="mb-1 block text-sm font-medium">Descrição</label>
          <textarea id="ativ-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} maxLength={5000} className={inputClass} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={publicar} onChange={(e) => setPublicar(e.target.checked)} className="size-4" />
          Publicar agora para a turma
        </label>
        <button type="submit" className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800">Salvar atividade</button>
      </form>
    </div>
  );
}

/* ---------------- Representantes ---------------- */

function nomeAluno(p: PerfilResumo): string {
  if (!p) return 'Aluno';
  return p.username ? `${p.display_name} (${p.username})` : p.display_name;
}

function RepresentantesAdmin() {
  const [representantes, setRepresentantes] = useState<RepAdmin[] | null>(null);
  const [turmas, setTurmas] = useState<TurmaAdmin[]>([]);
  const [turmaId, setTurmaId] = useState('');
  const [membros, setMembros] = useState<MembroTurma[]>([]);
  const [alunoId, setAlunoId] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  async function carregar() {
    const [r, t] = await Promise.all([
      supabase.from('class_representatives').select('class_id, user_id, classes(name), profiles(display_name, username)'),
      supabase.from('classes').select('id, name, school_year, shift, description, active').eq('active', true).order('name'),
    ]);
    if (r.error) setMsg({ tipo: 'erro', texto: 'Não foi possível carregar os representantes.' });
    setRepresentantes((r.data ?? []) as unknown as RepAdmin[]);
    setTurmas((t.data ?? []) as TurmaAdmin[]);
  }

  useEffect(() => {
    void carregar();
  }, []);

  useEffect(() => {
    setAlunoId('');
    setMembros([]);
    if (!turmaId) return;
    let ativo = true;
    supabase
      .from('class_memberships')
      .select('user_id, profiles(display_name, username)')
      .eq('class_id', turmaId)
      .eq('membership_status', 'ativo')
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) setMsg({ tipo: 'erro', texto: 'Não foi possível carregar os alunos da turma.' });
        setMembros((data ?? []) as unknown as MembroTurma[]);
      });
    return () => {
      ativo = false;
    };
  }, [turmaId]);

  const idsRepresentantes = new Set(
    (representantes ?? []).filter((r) => r.class_id === turmaId).map((r) => r.user_id),
  );
  const candidatos = membros
    .filter((m) => !idsRepresentantes.has(m.user_id))
    .sort((a, b) => (a.profiles?.display_name ?? '').localeCompare(b.profiles?.display_name ?? '', 'pt-BR'));

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const novos: Erros = {};
    if (!turmaId) novos.turma = 'Escolha a turma.';
    if (!alunoId) novos.aluno = 'Escolha o aluno.';
    setErros(novos);
    if (Object.keys(novos).length) return;

    const { error } = await supabase.from('class_representatives').insert({ class_id: turmaId, user_id: alunoId });
    if (error) {
      setMsg({ tipo: 'erro', texto: mensagemErro(error) });
      return;
    }
    setAlunoId('');
    setMsg({ tipo: 'ok', texto: 'Representante adicionado. Ele já pode publicar atividades e avisos da turma.' });
    void carregar();
  }

  async function remover(r: RepAdmin) {
    if (!window.confirm(`Remover ${nomeAluno(r.profiles)} como representante de ${r.classes?.name ?? 'esta turma'}?`)) return;
    const { error } = await supabase.from('class_representatives').delete().eq('class_id', r.class_id).eq('user_id', r.user_id);
    if (error) setMsg({ tipo: 'erro', texto: 'Não foi possível remover o representante.' });
    else setMsg({ tipo: 'ok', texto: 'Representante removido.' });
    void carregar();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-3">
        <h2 className="font-semibold">Representantes por turma</h2>
        {msg && (msg.tipo === 'erro' ? <Aviso>{msg.texto}</Aviso> : <Sucesso>{msg.texto}</Sucesso>)}
        {representantes === null ? (
          <div className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" role="status" aria-label="Carregando representantes" />
        ) : representantes.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum representante cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {representantes.map((r) => (
              <li key={`${r.class_id}-${r.user_id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="min-w-0">
                  <p className="truncate font-medium">{nomeAluno(r.profiles)}</p>
                  <p className="text-xs text-slate-500">{r.classes?.name}</p>
                </div>
                <button type="button" onClick={() => void remover(r)} className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                  Remover <span className="sr-only">{nomeAluno(r.profiles)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={adicionar} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="form-rep">
        <h2 id="form-rep" className="font-semibold">Novo representante</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Só alunos ativos da turma podem ser representantes.</p>
        <Campo id="rep-turma" label="Turma" erro={erros.turma}>
          <select id="rep-turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className={inputClass} aria-invalid={!!erros.turma}>
            <option value="">Escolha…</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Campo>
        <Campo id="rep-aluno" label="Aluno" erro={erros.aluno}>
          <select id="rep-aluno" value={alunoId} onChange={(e) => setAlunoId(e.target.value)} className={inputClass} disabled={!turmaId} aria-invalid={!!erros.aluno}>
            <option value="">{turmaId && candidatos.length === 0 ? 'Nenhum aluno disponível' : 'Escolha…'}</option>
            {candidatos.map((m) => <option key={m.user_id} value={m.user_id}>{nomeAluno(m.profiles)}</option>)}
          </select>
        </Campo>
        <button type="submit" className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800">Tornar representante</button>
      </form>
    </div>
  );
}

/* ---------------- Avisos ---------------- */

export function AvisosAdmin({ autorId, turmaIds, turmaFixa }: { autorId: string; turmaIds?: string[]; turmaFixa?: string }) {
  const representante = !!turmaIds;
  const [avisos, setAvisos] = useState<AvisoAdmin[] | null>(null);
  const [turmas, setTurmas] = useState<TurmaAdmin[]>([]);
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [categoria, setCategoria] = useState('geral');
  const [importancia, setImportancia] = useState('normal');
  const [paraTodos, setParaTodos] = useState(false);
  const [turmasSel, setTurmasSel] = useState<string[]>([]);
  const [erros, setErros] = useState<Erros>({});
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null);

  async function carregar() {
    const base = supabase.from('announcements').select('id, title, category, importance, status, published_at, is_global, announcement_targets(class_id)').order('published_at', { ascending: false });
    const baseTurmas = supabase.from('classes').select('id, name, school_year, shift, description, active').eq('active', true).order('name');
    const [a, t] = await Promise.all([
      representante ? base.eq('author_id', autorId) : base,
      turmaIds ? baseTurmas.in('id', turmaIds) : baseTurmas,
    ]);
    if (a.error) setMsg({ tipo: 'erro', texto: 'Não foi possível carregar os avisos.' });
    setAvisos((a.data ?? []) as unknown as AvisoAdmin[]);
    setTurmas((t.data ?? []) as TurmaAdmin[]);
  }

  useEffect(() => {
    void carregar();
  }, []);

  function alternarTurma(id: string) {
    setTurmasSel((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  async function publicar(e: FormEvent) {
    e.preventDefault();
    const novos: Erros = {};
    if (!titulo.trim()) novos.titulo = 'Informe o título do aviso.';
    if (!corpo.trim()) novos.corpo = 'Escreva o texto do aviso.';
    const destinoFixo = turmaFixa ? [turmaFixa] : turmasSel;
    if (!paraTodos && destinoFixo.length === 0) novos.destino = 'Escolha pelo menos uma turma ou marque "Para todas as turmas".';
    setErros(novos);
    if (Object.keys(novos).length) return;

    const agora = new Date().toISOString();
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title: titulo.trim(),
        body: corpo.trim(),
        category: categoria,
        importance: importancia,
        is_global: paraTodos,
        author_id: autorId,
        status: 'publicado',
        published_at: agora,
      })
      .select('id')
      .single();
    if (error || !data) {
      setMsg({ tipo: 'erro', texto: mensagemErro(error) });
      return;
    }
    if (!paraTodos) {
      const { error: errAlvo } = await supabase
        .from('announcement_targets')
        .insert(destinoFixo.map((class_id) => ({ announcement_id: data.id, class_id })));
      if (errAlvo) {
        setMsg({ tipo: 'erro', texto: 'O aviso foi criado, mas não foi possível associar as turmas. Edite-o para tentar de novo.' });
        void carregar();
        return;
      }
    }
    setTitulo('');
    setCorpo('');
    setTurmasSel([]);
    setParaTodos(false);
    setMsg({ tipo: 'ok', texto: 'Aviso publicado.' });
    void carregar();
  }

  async function arquivar(a: AvisoAdmin) {
    if (!window.confirm(`Arquivar o aviso "${a.title}"? Ele deixará de aparecer para os alunos.`)) return;
    const { error } = await supabase.from('announcements').update({ status: 'arquivado', updated_at: new Date().toISOString() }).eq('id', a.id);
    if (error) setMsg({ tipo: 'erro', texto: 'Não foi possível arquivar o aviso.' });
    else setMsg({ tipo: 'ok', texto: 'Aviso arquivado.' });
    void carregar();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-3">
        <h2 className="font-semibold">Avisos</h2>
        {msg && (msg.tipo === 'erro' ? <Aviso>{msg.texto}</Aviso> : <Sucesso>{msg.texto}</Sucesso>)}
        {avisos === null ? (
          <div className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" role="status" aria-label="Carregando avisos" />
        ) : avisos.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum aviso cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {avisos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.title}</p>
                  <p className="text-xs text-slate-500">
                    {CATEGORIAS_AVISO[a.category]} · {IMPORTANCIA_AVISO[a.importance]} · {a.is_global ? 'Todas as turmas' : `${a.announcement_targets.length} turma(s)`} · {a.status}
                  </p>
                </div>
                {a.status !== 'arquivado' && (
                  <button type="button" onClick={() => void arquivar(a)} className="rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                    Arquivar <span className="sr-only">{a.title}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={publicar} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="form-aviso">
        <h2 id="form-aviso" className="font-semibold">Novo aviso</h2>
        <Campo id="av-titulo" label="Título" erro={erros.titulo}>
          <input id="av-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={150} className={inputClass} aria-invalid={!!erros.titulo} />
        </Campo>
        <Campo id="av-corpo" label="Mensagem" erro={erros.corpo}>
          <textarea id="av-corpo" value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={4} maxLength={10000} className={inputClass} aria-invalid={!!erros.corpo} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="av-cat" className="mb-1 block text-sm font-medium">Categoria</label>
            <select id="av-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClass}>
              {Object.entries(CATEGORIAS_AVISO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="av-imp" className="mb-1 block text-sm font-medium">Importância</label>
            <select id="av-imp" value={importancia} onChange={(e) => setImportancia(e.target.value)} className={inputClass}>
              {Object.entries(IMPORTANCIA_AVISO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        {turmaFixa ? (
          <p className="rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
            Publicando em: {turmas.find((t) => t.id === turmaFixa)?.name ?? 'sala selecionada'}
          </p>
        ) : (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Destinatários</legend>
          {!representante && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={paraTodos} onChange={(e) => setParaTodos(e.target.checked)} className="size-4" />
              Para todas as turmas
            </label>
          )}
          {!paraTodos && (
            <div className="space-y-1">
              {turmas.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={turmasSel.includes(t.id)} onChange={() => alternarTurma(t.id)} className="size-4" />
                  {t.name}
                </label>
              ))}
            </div>
          )}
          {erros.destino && <p className="text-sm text-red-700 dark:text-red-300">{erros.destino}</p>}
        </fieldset>
        )}
        <button type="submit" className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800">Publicar aviso</button>
      </form>
    </div>
  );
}
