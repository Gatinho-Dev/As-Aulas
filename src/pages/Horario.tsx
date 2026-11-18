import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import CarregandoIA from '../components/CarregandoIA';
import { DIAS, MATERIAS, type Aula, type Linha } from '../data/horario6D';
import { TZ } from './assignmentUtils';

const NOMES_INGLES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/** Índice do dia da semana local (0 = segunda). Fim de semana cai na segunda. */
function diaAtual(): number {
  const nome = new Date().toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long' });
  const i = NOMES_INGLES.indexOf(nome);
  return i === -1 ? 0 : i;
}

/** Valida a grade vinda do banco antes de renderizar. */
function gradeValida(valor: unknown): valor is Linha[] {
  if (!Array.isArray(valor) || valor.length === 0) return false;
  return valor.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const linha = item as { tipo?: unknown; horario?: unknown; dias?: unknown };
    if (typeof linha.horario !== 'string') return false;
    if (linha.tipo === 'intervalo') return true;
    if (linha.tipo !== 'aula') return false;
    if (!Array.isArray(linha.dias) || linha.dias.length !== DIAS.length) return false;
    return linha.dias.every(
      (d) =>
        typeof d === 'object' &&
        d !== null &&
        typeof (d as { materia?: unknown }).materia === 'string' &&
        (d as { materia: string }).materia in MATERIAS &&
        typeof (d as { professor?: unknown }).professor === 'string',
    );
  });
}

type TurmaResumo = { id: string; name: string };

type Estado =
  | { fase: 'carregando' }
  | { fase: 'erro' }
  | { fase: 'sem-turma' }
  | { fase: 'sem-grade'; turma: TurmaResumo }
  | { fase: 'ok'; turma: TurmaResumo; grade: Linha[] };

function Cartao({ aula }: { aula: Aula }) {
  const materia = MATERIAS[aula.materia];
  return (
    <div className={`flex h-full min-h-[4.5rem] flex-col justify-center rounded-2xl px-3 py-2 shadow-sm ${materia.cor}`}>
      <span className="text-sm font-bold leading-tight">{aula.materia}</span>
      <span className="text-xs leading-snug opacity-80">{aula.professor}</span>
    </div>
  );
}

function CartaoIntervalo() {
  return (
    <div className="flex h-full min-h-[4.5rem] items-center justify-center rounded-2xl bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
      Intervalo
    </div>
  );
}

export default function Horario() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [dia, setDia] = useState(diaAtual);
  const hoje = diaAtual();
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' });

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void (async () => {
      const [memRes, prefRes] = await Promise.all([
        supabase
          .from('class_memberships')
          .select('class_id, classes(id, name)')
          .eq('user_id', userId)
          .eq('membership_status', 'ativo'),
        supabase.from('user_preferences').select('preferred_class_id').eq('user_id', userId).maybeSingle(),
      ]);
      if (!active) return;
      if (memRes.error || prefRes.error) {
        setEstado({ fase: 'erro' });
        return;
      }
      const vincs = (memRes.data ?? []) as { class_id: string; classes: TurmaResumo | TurmaResumo[] | null }[];
      if (vincs.length === 0) {
        setEstado({ fase: 'sem-turma' });
        return;
      }
      const preferida = prefRes.data?.preferred_class_id as string | undefined;
      const escolhido = vincs.find((v) => v.class_id === preferida) ?? vincs[0];
      const relacao = escolhido.classes;
      const turma = (Array.isArray(relacao) ? relacao[0] : relacao) ?? {
        id: escolhido.class_id,
        name: 'Sua turma',
      };
      const { data: agenda, error: agendaErro } = await supabase
        .from('class_schedules')
        .select('grade')
        .eq('class_id', turma.id)
        .maybeSingle();
      if (!active) return;
      if (agendaErro) {
        setEstado({ fase: 'erro' });
        return;
      }
      if (!gradeValida(agenda?.grade)) {
        setEstado({ fase: 'sem-grade', turma });
        return;
      }
      setEstado({ fase: 'ok', turma, grade: agenda.grade });
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  if (estado.fase === 'carregando') {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <CarregandoIA texto="Carregando grade horária…" />
      </div>
    );
  }

  if (estado.fase === 'erro') {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-8">
        <h1 className="font-display text-2xl font-bold text-indigo-900 dark:text-white">Grade horária</h1>
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          Não foi possível carregar a grade horária. Verifique sua conexão e tente novamente.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (estado.fase === 'sem-turma') {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-8">
        <h1 className="font-display text-2xl font-bold text-indigo-900 dark:text-white">Grade horária</h1>
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="font-medium">Você ainda não está em nenhuma turma.</p>
          <p className="mt-1 text-sm text-slate-500">Escolha a sua turma para ver a grade horária dela.</p>
          <Link
            to="/bem-vindo"
            className="mt-4 inline-block rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
          >
            Escolher minha turma
          </Link>
        </div>
      </div>
    );
  }

  if (estado.fase === 'sem-grade') {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-8">
        <h1 className="font-display text-2xl font-bold text-indigo-900 dark:text-white">
          Grade horária | Turma {estado.turma.name}
        </h1>
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="font-medium">Ainda não há grade horária cadastrada para a {estado.turma.name}.</p>
          <p className="mt-1 text-sm text-slate-500">Assim que a escola cadastrar, ela aparece aqui.</p>
        </div>
      </div>
    );
  }

  const grade = estado.grade;
  const aulasPorSemana = grade.filter((l) => l.tipo === 'aula').length * DIAS.length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-indigo-900 dark:text-white">
          Grade horária | Turma {estado.turma.name}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Segunda a sexta-feira · {aulasPorSemana} aulas por semana
        </p>
      </header>

      {/* Celular: um dia por vez */}
      <div className="md:hidden" data-tutorial="horario">
        <div role="tablist" aria-label="Dias da semana" className="mb-4 grid grid-cols-5 gap-1">
          {DIAS.map((nome, i) => (
            <button
              key={nome}
              type="button"
              role="tab"
              aria-selected={dia === i}
              onClick={() => setDia(i)}
              className={`rounded-xl px-1 py-2 text-xs font-semibold ${
                dia === i
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700'
              }`}
            >
              {nome.split('-')[0].slice(0, 3)}
              {i === hoje && <span className="block text-[10px] font-normal opacity-80">hoje</span>}
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {grade.map((linha, idx) => (
            <LinhaMobile key={idx} linha={linha} dia={dia} />
          ))}
        </ul>
      </div>

      {/* Computador: os cinco dias lado a lado */}
      <div className="hidden overflow-x-auto md:block" data-tutorial="horario">
        <div className="grid min-w-[52rem] grid-cols-[7rem_repeat(5,minmax(0,1fr))] gap-2">
          <div />
          {DIAS.map((nome, i) => (
            <div
              key={nome}
              className={`rounded-xl px-2 py-2 text-center text-sm font-semibold ${
                i === hoje ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {nome}
            </div>
          ))}
          {grade.map((linha, idx) => (
            <LinhaDesktop key={idx} linha={linha} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LinhaMobile({ linha, dia }: { linha: Linha; dia: number }) {
  if (linha.tipo === 'intervalo') {
    return (
      <li className="grid grid-cols-[5.5rem_1fr] items-stretch gap-3">
        <span className="pt-3 text-xs font-medium text-slate-500">{linha.horario}</span>
        <CartaoIntervalo />
      </li>
    );
  }
  return (
    <li className="grid grid-cols-[5.5rem_1fr] items-stretch gap-3">
      <span className="pt-3 text-xs font-medium text-slate-500">
        {linha.numero}ª aula
        <span className="block text-[11px] font-normal">{linha.horario}</span>
      </span>
      <Cartao aula={linha.dias[dia]} />
    </li>
  );
}

function LinhaDesktop({ linha }: { linha: Linha }) {
  if (linha.tipo === 'intervalo') {
    return (
      <>
        <div className="flex items-center text-xs font-medium text-slate-500">{linha.horario}</div>
        <div className="col-span-5">
          <CartaoIntervalo />
        </div>
      </>
    );
  }
  return (
    <>
      <div className="flex flex-col justify-center text-xs font-medium text-slate-500">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{linha.numero}ª aula</span>
        {linha.horario}
      </div>
      {linha.dias.map((aula, i) => (
        <Cartao key={i} aula={aula} />
      ))}
    </>
  );
}
