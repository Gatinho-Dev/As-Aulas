import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, ChevronLeft, Trash2 } from 'lucide-react';
import {
  carregarPlanos,
  excluirPlano,
  gerarPlano,
  salvarPlano,
  type PedidoEstudo,
  type Plano as PlanoSalvo,
} from './artefatosApi';

const NIVEIS = ['fácil', 'médio', 'difícil'];

const campo =
  'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';

function dataCurta(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

export default function PlanoEstudos({ abrirId }: { abrirId?: string | null }) {
  const [planos, setPlanos] = useState<PlanoSalvo[]>([]);
  const [selecionado, setSelecionado] = useState<PlanoSalvo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [materia, setMateria] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [serie, setSerie] = useState('');
  const [nivel, setNivel] = useState(NIVEIS[1]);
  const [semanas, setSemanas] = useState(4);

  useEffect(() => {
    void recarregar();
  }, []);

  useEffect(() => {
    if (!abrirId) return;
    const achado = planos.find((p) => p.id === abrirId);
    if (achado) setSelecionado(achado);
  }, [abrirId, planos]);

  async function recarregar() {
    setCarregando(true);
    const resposta = await carregarPlanos();
    if ('erro' in resposta) setErro(resposta.erro);
    else setPlanos(resposta.planos);
    setCarregando(false);
  }

  async function gerar(e: FormEvent) {
    e.preventDefault();
    if (gerando || !materia.trim()) return;

    setGerando(true);
    setErro(null);
    const pedido: PedidoEstudo = {
      materia: materia.trim(),
      tema: objetivo.trim(),
      objetivo: objetivo.trim(),
      serie: serie.trim(),
      nivel,
      quantidade: semanas,
    };

    const gerado = await gerarPlano(pedido);
    if ('erro' in gerado) {
      setErro(gerado.erro.mensagem);
      setGerando(false);
      return;
    }

    const salvo = await salvarPlano(
      gerado.titulo,
      gerado.materia || pedido.materia,
      gerado.objetivo || pedido.objetivo || '',
      gerado.dados,
    );
    if ('erro' in salvo) {
      setErro(salvo.erro);
      setGerando(false);
      return;
    }

    setGerando(false);
    const resposta = await carregarPlanos();
    if ('planos' in resposta) {
      setPlanos(resposta.planos);
      setSelecionado(resposta.planos.find((p) => p.id === salvo.id) ?? null);
    }
  }

  async function excluir(plano: PlanoSalvo) {
    if (!window.confirm(`Excluir o plano "${plano.titulo}"?`)) return;
    const ok = await excluirPlano(plano.id);
    if (!ok) {
      setErro('Não foi possível excluir o plano.');
      return;
    }
    if (selecionado?.id === plano.id) setSelecionado(null);
    await recarregar();
  }

  if (selecionado) {
    return (
      <article aria-label="Plano de estudos" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selecionado.titulo}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {selecionado.materia || 'Sem matéria'}
              {selecionado.objetivo ? ` · ${selecionado.objetivo}` : ''} · {dataCurta(selecionado.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelecionado(null)}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <ChevronLeft className="size-4" aria-hidden /> Meus planos
          </button>
        </div>

        <ol className="space-y-3">
          {selecionado.dados.semanas.map((semana, i) => (
            <li key={i} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                Semana {i + 1}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{semana.titulo}</h3>
              {semana.foco && <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{semana.foco}</p>}
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800 dark:text-slate-200">
                {semana.tarefas.map((tarefa, j) => (
                  <li key={j}>{tarefa}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={gerar}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900"
      >
        <label className="text-sm font-medium">
          Matéria *
          <input className={campo} value={materia} onChange={(e) => setMateria(e.target.value)} maxLength={120} required />
        </label>
        <label className="text-sm font-medium">
          Objetivo
          <input
            className={campo}
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            maxLength={300}
            placeholder="Ex.: recuperar notas em álgebra"
          />
        </label>
        <label className="text-sm font-medium">
          Série ou nível
          <input
            className={campo}
            value={serie}
            onChange={(e) => setSerie(e.target.value)}
            maxLength={120}
            placeholder="Ex.: 9º ano do fundamental"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Dificuldade
            <select className={campo} value={nivel} onChange={(e) => setNivel(e.target.value)}>
              {NIVEIS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Semanas
            <input
              type="number"
              min={1}
              max={12}
              className={campo}
              value={semanas}
              onChange={(e) => setSemanas(Math.min(12, Math.max(1, Number(e.target.value) || 4)))}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={gerando || !materia.trim()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
        >
          <CalendarDays className="size-4" aria-hidden /> {gerando ? 'Montando plano…' : 'Gerar plano de estudos'}
        </button>
      </form>

      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{erro}</p>}

      <section aria-label="Meus planos" className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Meus planos</h2>
        {carregando ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Carregando…</p>
        ) : planos.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum plano ainda. Gere o primeiro acima.</p>
        ) : (
          <ul className="space-y-2">
            {planos.map((plano) => (
              <li
                key={plano.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{plano.titulo}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {plano.materia || 'Sem matéria'} · {plano.dados.semanas.length} semanas · {dataCurta(plano.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelecionado(plano)}
                  className="min-h-11 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white"
                >
                  Abrir
                </button>
                <button
                  type="button"
                  onClick={() => void excluir(plano)}
                  aria-label={`Excluir ${plano.titulo}`}
                  className="inline-flex size-11 items-center justify-center rounded-lg bg-slate-100 text-red-700 dark:bg-slate-800 dark:text-red-300"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
