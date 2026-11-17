import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, FileText, Trash2 } from 'lucide-react';
import Markdown from './Markdown';
import {
  carregarResumos,
  excluirResumo,
  gerarResumo,
  salvarResumo,
  type PedidoEstudo,
  type Resumo as ResumoSalvo,
} from './artefatosApi';
import CarregandoIA from '../components/CarregandoIA';

const NIVEIS = ['fácil', 'médio', 'difícil'];

const campo =
  'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';

function dataCurta(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

export default function Resumo({ abrirId }: { abrirId?: string | null }) {
  const [resumos, setResumos] = useState<ResumoSalvo[]>([]);
  const [selecionado, setSelecionado] = useState<ResumoSalvo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [materia, setMateria] = useState('');
  const [tema, setTema] = useState('');
  const [serie, setSerie] = useState('');
  const [nivel, setNivel] = useState(NIVEIS[1]);

  useEffect(() => {
    void recarregar();
  }, []);

  useEffect(() => {
    if (!abrirId) return;
    const achado = resumos.find((r) => r.id === abrirId);
    if (achado) setSelecionado(achado);
  }, [abrirId, resumos]);

  async function recarregar() {
    setCarregando(true);
    const resposta = await carregarResumos();
    if ('erro' in resposta) setErro(resposta.erro);
    else setResumos(resposta.resumos);
    setCarregando(false);
  }

  async function gerar(e: FormEvent) {
    e.preventDefault();
    if (gerando || !materia.trim() || !tema.trim()) return;

    setGerando(true);
    setErro(null);
    const pedido: PedidoEstudo = { materia: materia.trim(), tema: tema.trim(), serie: serie.trim(), nivel };

    const gerado = await gerarResumo(pedido);
    if ('erro' in gerado) {
      setErro(gerado.erro.mensagem);
      setGerando(false);
      return;
    }

    const salvo = await salvarResumo(gerado.titulo, gerado.materia || pedido.materia, gerado.dados);
    if ('erro' in salvo) {
      setErro(salvo.erro);
      setGerando(false);
      return;
    }

    setGerando(false);
    const resposta = await carregarResumos();
    if ('resumos' in resposta) {
      setResumos(resposta.resumos);
      setSelecionado(resposta.resumos.find((r) => r.id === salvo.id) ?? null);
    }
  }

  async function excluir(resumo: ResumoSalvo) {
    if (!window.confirm(`Excluir o resumo "${resumo.titulo}"?`)) return;
    const ok = await excluirResumo(resumo.id);
    if (!ok) {
      setErro('Não foi possível excluir o resumo.');
      return;
    }
    if (selecionado?.id === resumo.id) setSelecionado(null);
    await recarregar();
  }

  if (selecionado) {
    return (
      <article aria-label="Resumo" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selecionado.titulo}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {selecionado.materia || 'Sem matéria'} · {dataCurta(selecionado.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelecionado(null)}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <ChevronLeft className="size-4" aria-hidden /> Meus resumos
          </button>
        </div>

        <ol className="space-y-3">
          {selecionado.dados.topicos.map((topico, i) => (
            <li key={i} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {i + 1}. {topico.titulo}
              </h3>
              <div className="text-sm text-slate-800 dark:text-slate-200">
                <Markdown texto={topico.explicacao} />
              </div>
            </li>
          ))}
        </ol>

        {selecionado.dados.pontos_chave.length > 0 && (
          <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950">
            <h3 className="mb-2 text-sm font-semibold text-indigo-900 dark:text-indigo-200">Pontos-chave</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-indigo-900 dark:text-indigo-100">
              {selecionado.dados.pontos_chave.map((ponto, i) => (
                <li key={i}>{ponto}</li>
              ))}
            </ul>
          </section>
        )}

        {selecionado.dados.resumo_final && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Resumo final</h3>
            <div className="text-sm text-slate-800 dark:text-slate-200">
              <Markdown texto={selecionado.dados.resumo_final} />
            </div>
          </section>
        )}
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
          Tema *
          <input className={campo} value={tema} onChange={(e) => setTema(e.target.value)} maxLength={200} required />
        </label>
        <label className="text-sm font-medium">
          Série ou nível
          <input
            className={campo}
            value={serie}
            onChange={(e) => setSerie(e.target.value)}
            maxLength={120}
            placeholder="Ex.: 1º ano do ensino médio"
          />
        </label>
        <label className="text-sm font-medium">
          Dificuldade
          <select className={campo} value={nivel} onChange={(e) => setNivel(e.target.value)}>
            {NIVEIS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={gerando || !materia.trim() || !tema.trim()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
        >
          <FileText className="size-4" aria-hidden /> {gerando ? 'Montando resumo…' : 'Gerar resumo'}
        </button>
      </form>

      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{erro}</p>}

      <section aria-label="Meus resumos" className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Meus resumos</h2>
        {carregando ? (
          <CarregandoIA texto="Carregando…" />
        ) : resumos.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum resumo ainda. Gere o primeiro acima.</p>
        ) : (
          <ul className="space-y-2">
            {resumos.map((resumo) => (
              <li
                key={resumo.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{resumo.titulo}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {resumo.materia || 'Sem matéria'} · {resumo.dados.topicos.length} tópicos · {dataCurta(resumo.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelecionado(resumo)}
                  className="min-h-11 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white"
                >
                  Abrir
                </button>
                <button
                  type="button"
                  onClick={() => void excluir(resumo)}
                  aria-label={`Excluir ${resumo.titulo}`}
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
