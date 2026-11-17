import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, ListChecks, RotateCcw, Trash2, XCircle } from 'lucide-react';
import {
  carregarQuestoes,
  carregarSimulados,
  excluirSimulado,
  gerarSimulado,
  salvarResultado,
  salvarSimulado,
  type PedidoEstudo,
  type QuestaoSalva,
  type Simulado as SimuladoSalvo,
} from './artefatosApi';
import { corrigirSimulado, percentual, type Correcao } from './simuladoUtils';
import CarregandoIA from '../components/CarregandoIA';

const NIVEIS = ['fácil', 'médio', 'difícil'];
const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

const campo =
  'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';

function dataCurta(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

export default function Simulado({ abrirId }: { abrirId?: string | null } = {}) {
  const [simulados, setSimulados] = useState<SimuladoSalvo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [materia, setMateria] = useState('');
  const [tema, setTema] = useState('');
  const [serie, setSerie] = useState('');
  const [nivel, setNivel] = useState(NIVEIS[1]);
  const [quantidade, setQuantidade] = useState(5);

  const [quiz, setQuiz] = useState<{ id: string; titulo: string; questoes: QuestaoSalva[] } | null>(null);
  const [respostas, setRespostas] = useState<(number | null)[]>([]);
  const [correcao, setCorrecao] = useState<Correcao | null>(null);

  useEffect(() => {
    void recarregar();
  }, []);

  async function recarregar() {
    setCarregando(true);
    const resposta = await carregarSimulados();
    if ('erro' in resposta) setErro(resposta.erro);
    else setSimulados(resposta.simulados);
    setCarregando(false);
  }

  function abrir(id: string, titulo: string, questoes: QuestaoSalva[]) {
    setQuiz({ id, titulo, questoes });
    setRespostas(questoes.map(() => null));
    setCorrecao(null);
  }

  async function gerar(e: FormEvent) {
    e.preventDefault();
    if (gerando || !materia.trim() || !tema.trim()) return;

    setGerando(true);
    setErro(null);
    const pedido: PedidoEstudo = {
      materia: materia.trim(),
      tema: tema.trim(),
      serie: serie.trim(),
      nivel,
      quantidade,
    };

    const gerado = await gerarSimulado(pedido);
    if ('erro' in gerado) {
      setErro(gerado.erro.mensagem);
      setGerando(false);
      return;
    }

    const salvo = await salvarSimulado(gerado.titulo, gerado.materia || pedido.materia, gerado.questoes);
    if ('erro' in salvo) {
      setErro(salvo.erro);
      setGerando(false);
      return;
    }

    const questoes = await carregarQuestoes(salvo.id);
    setGerando(false);
    await recarregar();
    if ('erro' in questoes) {
      setErro(questoes.erro);
      return;
    }
    abrir(salvo.id, gerado.titulo, questoes.questoes);
  }

  async function abrirSalvo(simulado: SimuladoSalvo) {
    setErro(null);
    const resposta = await carregarQuestoes(simulado.id);
    if ('erro' in resposta) {
      setErro(resposta.erro);
      return;
    }
    if (resposta.questoes.length === 0) {
      setErro('Este simulado está vazio.');
      return;
    }
    abrir(simulado.id, simulado.titulo, resposta.questoes);
  }

  // Abre o simulado quando o aluno chega pela aba Meus materiais.
  useEffect(() => {
    if (!abrirId || quiz) return;
    const simulado = simulados.find((s) => s.id === abrirId);
    if (simulado) void abrirSalvo(simulado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirId, simulados]);

  async function excluir(simulado: SimuladoSalvo) {
    if (!window.confirm(`Excluir o simulado "${simulado.titulo}"?`)) return;
    const ok = await excluirSimulado(simulado.id);
    if (!ok) {
      setErro('Não foi possível excluir o simulado.');
      return;
    }
    if (quiz?.id === simulado.id) setQuiz(null);
    await recarregar();
  }

  async function corrigir() {
    if (!quiz) return;
    const resultado = corrigirSimulado(
      quiz.questoes.map((q) => q.correta),
      respostas,
    );
    setCorrecao(resultado);
    await salvarResultado(quiz.id, {
      acertos: resultado.acertos,
      total: resultado.total,
      respostas,
      em: new Date().toISOString(),
    });
    await recarregar();
  }

  if (quiz) {
    const emBranco = respostas.filter((r) => r === null).length;

    return (
      <section aria-label="Simulado" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{quiz.titulo}</h2>
          <button
            type="button"
            onClick={() => {
              setQuiz(null);
              setCorrecao(null);
            }}
            className="min-h-11 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Voltar aos simulados
          </button>
        </div>

        {correcao && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {correcao.acertos} de {correcao.total} corretas ({percentual(correcao)}%)
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {percentual(correcao) >= 70
                ? 'Bom resultado! Revise as questões erradas para consolidar.'
                : 'Vale revisar o conteúdo e refazer o simulado depois.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setRespostas(quiz.questoes.map(() => null));
                setCorrecao(null);
              }}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white"
            >
              <RotateCcw className="size-4" aria-hidden /> Refazer
            </button>
          </div>
        )}

        <ol className="space-y-3">
          {quiz.questoes.map((questao, i) => {
            const marcada = respostas[i];
            const acertou = correcao?.acertou[i];
            return (
              <li
                key={questao.id}
                className={`rounded-xl border bg-white p-4 dark:bg-slate-900 ${
                  correcao
                    ? acertou
                      ? 'border-emerald-400 dark:border-emerald-700'
                      : 'border-red-400 dark:border-red-800'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{i + 1}.</span>
                  <p className="whitespace-pre-wrap text-sm font-medium text-slate-900 dark:text-slate-100">
                    {questao.enunciado}
                  </p>
                  {correcao &&
                    (acertou ? (
                      <CheckCircle2 className="ml-auto size-5 shrink-0 text-emerald-600" aria-label="Correta" />
                    ) : (
                      <XCircle className="ml-auto size-5 shrink-0 text-red-600" aria-label="Incorreta" />
                    ))}
                </div>

                <fieldset className="mt-3 space-y-2" disabled={correcao !== null}>
                  <legend className="sr-only">Alternativas</legend>
                  {questao.alternativas.map((alternativa, j) => {
                    const correta = correcao && j === questao.correta;
                    const erradaMarcada = correcao && marcada === j && j !== questao.correta;
                    return (
                      <label
                        key={j}
                        className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${
                          correta
                            ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950'
                            : erradaMarcada
                              ? 'border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950'
                              : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`questao-${i}`}
                          checked={marcada === j}
                          onChange={() => setRespostas((atual) => atual.map((r, k) => (k === i ? j : r)))}
                          className="mt-0.5 size-4"
                        />
                        <span>
                          <strong className="mr-1">{LETRAS[j] ?? j + 1})</strong>
                          {alternativa}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>

                {correcao && questao.explicacao && (
                  <p className="mt-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <strong>Explicação: </strong>
                    {questao.explicacao}
                  </p>
                )}
              </li>
            );
          })}
        </ol>

        {!correcao && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void corrigir()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white"
            >
              <ListChecks className="size-4" aria-hidden /> Corrigir simulado
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {emBranco === 0 ? 'Todas as questões respondidas.' : `${emBranco} questão(ões) em branco.`}
            </span>
          </div>
        )}

        {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{erro}</p>}
      </section>
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
            placeholder="Ex.: 2º ano do ensino médio"
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
            Questões
            <input
              type="number"
              min={3}
              max={20}
              className={campo}
              value={quantidade}
              onChange={(e) => setQuantidade(Math.min(20, Math.max(3, Number(e.target.value) || 5)))}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={gerando || !materia.trim() || !tema.trim()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
        >
          <ListChecks className="size-4" aria-hidden /> {gerando ? 'Gerando simulado…' : 'Gerar simulado'}
        </button>
      </form>

      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{erro}</p>}

      <section aria-label="Seus simulados" className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Seus simulados</h2>
        {carregando ? (
          <CarregandoIA texto="Carregando…" />
        ) : simulados.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum simulado ainda. Gere o primeiro acima.</p>
        ) : (
          <ul className="space-y-2">
            {simulados.map((simulado) => (
              <li
                key={simulado.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{simulado.titulo}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {simulado.materia || 'Sem matéria'} · {simulado.total} questões · {dataCurta(simulado.created_at)}
                    {simulado.ultimo_resultado
                      ? ` · último resultado: ${simulado.ultimo_resultado.acertos}/${simulado.ultimo_resultado.total}`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void abrirSalvo(simulado)}
                  className="min-h-11 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white"
                >
                  Abrir
                </button>
                <button
                  type="button"
                  onClick={() => void excluir(simulado)}
                  aria-label={`Excluir ${simulado.titulo}`}
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
