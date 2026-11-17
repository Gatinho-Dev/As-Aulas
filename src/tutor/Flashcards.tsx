import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Layers, RotateCcw, Trash2 } from 'lucide-react';
import Markdown from './Markdown';
import {
  carregarCartoes,
  carregarDecks,
  excluirDeck,
  gerarFlashcards,
  marcarCartao,
  salvarDeck,
  type Cartao,
  type Deck,
  type PedidoEstudo,
  type StatusCartao,
} from './artefatosApi';

const NIVEIS = ['fácil', 'médio', 'difícil'];

const campo =
  'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';

function dataCurta(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

export default function Flashcards({ abrirId }: { abrirId?: string | null } = {}) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [materia, setMateria] = useState('');
  const [tema, setTema] = useState('');
  const [serie, setSerie] = useState('');
  const [nivel, setNivel] = useState(NIVEIS[1]);
  const [quantidade, setQuantidade] = useState(8);

  const [estudo, setEstudo] = useState<{ titulo: string; cartoes: Cartao[] } | null>(null);
  const [indice, setIndice] = useState(0);
  const [virado, setVirado] = useState(false);
  const [resultado, setResultado] = useState<{ sabidos: number; revisar: number } | null>(null);

  useEffect(() => {
    void recarregar();
  }, []);

  async function recarregar() {
    setCarregando(true);
    const resposta = await carregarDecks();
    if ('erro' in resposta) setErro(resposta.erro);
    else setDecks(resposta.decks);
    setCarregando(false);
  }

  function iniciarEstudo(titulo: string, cartoes: Cartao[]) {
    setEstudo({ titulo, cartoes });
    setIndice(0);
    setVirado(false);
    setResultado(null);
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

    const gerado = await gerarFlashcards(pedido);
    if ('erro' in gerado) {
      setErro(gerado.erro.mensagem);
      setGerando(false);
      return;
    }

    const salvo = await salvarDeck(gerado.titulo, gerado.materia || pedido.materia, gerado.cards);
    if ('erro' in salvo) {
      setErro(salvo.erro);
      setGerando(false);
      return;
    }

    const cartoes = await carregarCartoes(salvo.id);
    setGerando(false);
    await recarregar();
    if ('erro' in cartoes) {
      setErro(cartoes.erro);
      return;
    }
    iniciarEstudo(gerado.titulo, cartoes.cartoes);
  }

  async function abrir(deck: Deck) {
    setErro(null);
    const resposta = await carregarCartoes(deck.id);
    if ('erro' in resposta) {
      setErro(resposta.erro);
      return;
    }
    if (resposta.cartoes.length === 0) {
      setErro('Esta coleção está vazia.');
      return;
    }
    iniciarEstudo(deck.titulo, resposta.cartoes);
  }

  // Abre a coleção quando o aluno chega pela aba Meus materiais.
  useEffect(() => {
    if (!abrirId || estudo) return;
    const deck = decks.find((d) => d.id === abrirId);
    if (deck) void abrir(deck);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirId, decks]);

  async function excluir(deck: Deck) {
    if (!window.confirm(`Excluir a coleção "${deck.titulo}"?`)) return;
    const ok = await excluirDeck(deck.id);
    if (!ok) {
      setErro('Não foi possível excluir a coleção.');
      return;
    }
    if (estudo) setEstudo(null);
    await recarregar();
  }

  async function responder(status: Exclude<StatusCartao, 'novo'>) {
    if (!estudo) return;
    const cartao = estudo.cartoes[indice];
    await marcarCartao(cartao.id, status);

    const cartoes = estudo.cartoes.map((c, i) => (i === indice ? { ...c, status } : c));
    setEstudo({ ...estudo, cartoes });

    if (indice + 1 >= cartoes.length) {
      const sabidos = cartoes.filter((c) => c.status === 'sabido').length;
      setResultado({ sabidos, revisar: cartoes.length - sabidos });
      setVirado(false);
      return;
    }
    setIndice(indice + 1);
    setVirado(false);
  }

  if (estudo) {
    const cartao = estudo.cartoes[indice];

    return (
      <section aria-label="Estudo de flashcards" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{estudo.titulo}</h2>
          <button
            type="button"
            onClick={() => {
              setEstudo(null);
              setResultado(null);
            }}
            className="min-h-11 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Voltar às coleções
          </button>
        </div>

        {resultado ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {resultado.sabidos} de {estudo.cartoes.length} marcados como sabidos
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {resultado.revisar > 0
                ? `${resultado.revisar} cartão(ões) ficaram para revisar.`
                : 'Você não deixou nenhum cartão para revisar.'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => iniciarEstudo(estudo.titulo, estudo.cartoes.map((c) => ({ ...c, status: 'novo' as const })))}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white"
              >
                <RotateCcw className="size-4" aria-hidden /> Estudar de novo
              </button>
              <button
                type="button"
                onClick={() => {
                  setEstudo(null);
                  setResultado(null);
                }}
                className="min-h-11 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>
                Cartão {indice + 1} de {estudo.cartoes.length}
              </span>
              <span>{cartao.status === 'novo' ? 'Novo' : cartao.status === 'sabido' ? 'Sabido' : 'Revisar'}</span>
            </div>

            <button
              type="button"
              onClick={() => setVirado((v) => !v)}
              aria-label={virado ? 'Mostrar pergunta' : 'Mostrar resposta'}
              className="min-h-56 w-full rounded-xl border border-slate-200 bg-white p-6 text-left text-base text-slate-900 transition hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                {virado ? 'Resposta' : 'Pergunta'}
              </span>
              {virado ? <Markdown texto={cartao.verso} /> : <p className="whitespace-pre-wrap">{cartao.frente}</p>}
              <span className="mt-4 block text-xs text-slate-500 dark:text-slate-400">
                {virado ? 'Clique para voltar à pergunta' : 'Clique no cartão para ver a resposta'}
              </span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void responder('revisar')}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-amber-100 px-4 text-sm font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200"
              >
                Ainda não sei
              </button>
              <button
                type="button"
                onClick={() => void responder('sabido')}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"
              >
                Já sei
              </button>
              <span className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIndice(Math.max(0, indice - 1))}
                  disabled={indice === 0}
                  aria-label="Cartão anterior"
                  className="inline-flex size-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setIndice(Math.min(estudo.cartoes.length - 1, indice + 1))}
                  disabled={indice === estudo.cartoes.length - 1}
                  aria-label="Próximo cartão"
                  className="inline-flex size-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200"
                >
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              </span>
            </div>
          </>
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
            placeholder="Ex.: 8º ano do fundamental"
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
            Cartões
            <input
              type="number"
              min={3}
              max={20}
              className={campo}
              value={quantidade}
              onChange={(e) => setQuantidade(Math.min(20, Math.max(3, Number(e.target.value) || 8)))}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={gerando || !materia.trim() || !tema.trim()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
        >
          <Layers className="size-4" aria-hidden /> {gerando ? 'Gerando flashcards…' : 'Gerar flashcards'}
        </button>
      </form>

      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{erro}</p>}

      <section aria-label="Suas coleções" className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Suas coleções</h2>
        {carregando ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Carregando…</p>
        ) : decks.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Nenhuma coleção ainda. Gere a primeira com o formulário acima.
          </p>
        ) : (
          <ul className="space-y-2">
            {decks.map((deck) => (
              <li
                key={deck.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{deck.titulo}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {deck.materia || 'Sem matéria'} · {deck.total} cartões · {dataCurta(deck.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void abrir(deck)}
                  className="min-h-11 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white"
                >
                  Estudar
                </button>
                <button
                  type="button"
                  onClick={() => void excluir(deck)}
                  aria-label={`Excluir ${deck.titulo}`}
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
