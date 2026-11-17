import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  TYPE_LABEL,
  loadAssignments,
  loadProgressMap,
  statusOf,
  type AssignmentRow,
  type AssignmentType,
  type Progress,
} from './assignmentUtils';

const ROTA: Record<AssignmentType, string> = {
  licao_casa: '/licoes',
  trabalho: '/trabalhos',
  prova: '/provas',
};

type Dados = { itens: AssignmentRow[]; progresso: Record<string, Progress> };

async function carregar(): Promise<Dados> {
  const [grupos, progresso] = await Promise.all([
    Promise.all([loadAssignments('licao_casa'), loadAssignments('trabalho'), loadAssignments('prova')]),
    loadProgressMap(),
  ]);
  return { itens: grupos.flat(), progresso };
}

export default function Desempenho() {
  const { profile } = useAuth();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [materia, setMateria] = useState('todas');
  const [tipo, setTipo] = useState<'todos' | AssignmentType>('todos');

  useEffect(() => {
    carregar()
      .then(setDados)
      .catch(() => setErro('Não foi possível carregar seu desempenho. Tente novamente.'));
  }, []);

  const filtrados = useMemo(
    () =>
      (dados?.itens ?? []).filter(
        (i) => (materia === 'todas' || i.subjects?.name === materia) && (tipo === 'todos' || i.type === tipo),
      ),
    [dados, materia, tipo],
  );

  const materias = useMemo(
    () => Array.from(new Set((dados?.itens ?? []).map((i) => i.subjects?.name).filter(Boolean) as string[])).sort(),
    [dados],
  );

  const porMateria = useMemo(() => {
    const mapa: Record<string, { concluidas: number; total: number }> = {};
    for (const i of dados?.itens ?? []) {
      const nome = i.subjects?.name ?? 'Sem matéria';
      mapa[nome] ??= { concluidas: 0, total: 0 };
      mapa[nome].total += 1;
      if (dados?.progresso[i.id]?.personal_status === 'concluida') mapa[nome].concluidas += 1;
    }
    return Object.entries(mapa).sort(([a], [b]) => a.localeCompare(b));
  }, [dados]);

  if (erro) return <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{erro}</p>;
  if (!dados) return <div role="status" aria-label="Carregando desempenho" className="h-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />;

  const concluidas = filtrados.filter((i) => statusOf(i.due_at, dados.progresso[i.id]?.personal_status) === 'concluida');
  const atrasadas = filtrados.filter((i) => statusOf(i.due_at, dados.progresso[i.id]?.personal_status) === 'atrasada');
  const pendentes = filtrados.filter((i) => statusOf(i.due_at, dados.progresso[i.id]?.personal_status) === 'pendente');
  const percentual = filtrados.length ? Math.round((concluidas.length / filtrados.length) * 100) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meu Desempenho</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Acompanhe sua evolução e descubra como melhorar cada dia mais.</p>
        <p className="mt-2 text-sm text-slate-500">{profile?.display_name}</p>
      </header>

      <section aria-label="Filtros" className="grid gap-3 sm:flex sm:flex-wrap">
        <label className="text-sm">
          <span className="mr-2 text-slate-600 dark:text-slate-400">Matéria</span>
          <select value={materia} onChange={(e) => setMateria(e.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:w-auto dark:border-slate-700 dark:bg-slate-900">
            <option value="todas">Todas</option>
            {materias.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mr-2 text-slate-600 dark:text-slate-400">Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as 'todos' | AssignmentType)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:w-auto dark:border-slate-700 dark:bg-slate-900">
            <option value="todos">Todos</option>
            {(Object.keys(TYPE_LABEL) as AssignmentType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </label>
      </section>

      <section aria-label="Resumo" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao titulo="Conclusão" valor={percentual === null ? 'Sem atividades' : `${percentual}%`} detalhe={`${concluidas.length} de ${filtrados.length} atividades concluídas`} />
        <Cartao titulo="Pendentes" valor={String(pendentes.length)} detalhe="Ainda dentro do prazo" />
        <Cartao titulo="Atrasadas" valor={String(atrasadas.length)} detalhe="Passaram do prazo sem conclusão" />
        <Cartao titulo="Total" valor={String(filtrados.length)} detalhe="Atividades publicadas" />
      </section>

      <section aria-label="O que posso melhorar" className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">O que posso melhorar?</h2>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          {atrasadas.length > 0 && <li>Você tem {atrasadas.length} atividade(s) atrasada(s). Comece pela mais antiga.</li>}
          {pendentes.length > 0 && <li>Você ainda tem {pendentes.length} atividade(s) pendente(s) dentro do prazo.</li>}
          {filtrados.length > 0 && atrasadas.length === 0 && pendentes.length === 0 && <li>Parabéns, nenhuma atividade pendente ou atrasada neste filtro.</li>}
          {filtrados.length === 0 && <li>Continue registrando e realizando suas atividades para receber recomendações.</li>}
        </ul>
      </section>

      <section aria-label="Gráfico de conclusão" className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Conclusão das atividades</h2>
        {filtrados.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">O gráfico aparecerá quando houver atividades publicadas.</p>
        ) : (
          <ul className="space-y-2" aria-label={`Concluídas ${concluidas.length}, pendentes ${pendentes.length}, atrasadas ${atrasadas.length}`}>
            {[
              { rotulo: 'Concluídas', valor: concluidas.length, cor: 'bg-emerald-600' },
              { rotulo: 'Pendentes', valor: pendentes.length, cor: 'bg-amber-500' },
              { rotulo: 'Atrasadas', valor: atrasadas.length, cor: 'bg-rose-600' },
            ].map((b) => (
              <li key={b.rotulo} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-slate-700 dark:text-slate-300">{b.rotulo}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className={`h-3 ${b.cor}`} style={{ width: `${filtrados.length ? (b.valor / filtrados.length) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right font-semibold text-slate-900 dark:text-white">{b.valor}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Desempenho por matéria" className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Desempenho por matéria</h2>
        {porMateria.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Nenhuma matéria com atividades publicadas.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {porMateria.map(([nome, t]) => (
              <li key={nome} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="font-semibold text-slate-900 dark:text-white">{nome}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t.concluidas} de {t.total} concluídas</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Atividades do período" className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Atividades</h2>
        {filtrados.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Nenhuma atividade publicada ainda. Seu desempenho aparecerá aqui conforme as atividades forem publicadas.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtrados.map((i) => {
              const estado = statusOf(i.due_at, dados.progresso[i.id]?.personal_status);
              const rotulo = estado === 'concluida' ? 'Concluída' : estado === 'atrasada' ? 'Atrasada' : 'Pendente';
              return (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{i.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{TYPE_LABEL[i.type]} · {i.subjects?.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">{rotulo}</span>
                    <Link to={`${ROTA[i.type]}/${i.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 underline dark:text-indigo-300">Abrir</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Cartao({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-600 dark:text-slate-400">{titulo}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{detalhe}</p>
    </div>
  );
}
