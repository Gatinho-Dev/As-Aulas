import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, X } from 'lucide-react';
import { PASSOS_TUTORIAL, passoAnterior, proximoPasso, type PassoTutorial } from './passos';

type Retangulo = { top: number; left: number; width: number; height: number };

type Props = {
  /** Retorna uma mensagem de erro, ou null quando o tutorial pode ser fechado. */
  onEncerrar: (concluido: boolean) => Promise<string | null>;
};

const BOAS_VINDAS = -1;
const FINAL = PASSOS_TUTORIAL.length;
const LARGURA_CARTAO = 360;
const ALTURA_CARTAO = 300;
const MARGEM = 16;

function elementoVisivel(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}

/** Primeiro elemento visível entre os alvos do passo; elementos ocultos em outro layout são ignorados. */
function buscarAlvo(passo: PassoTutorial): HTMLElement | null {
  for (const seletor of passo.alvos) {
    const encontrado = Array.from(document.querySelectorAll<HTMLElement>(seletor)).find(elementoVisivel);
    if (encontrado) return encontrado;
  }
  return null;
}

/** Elementos presos à tela (menu inferior, cabeçalho) não se movem com a rolagem. */
function estaFixo(el: Element): boolean {
  for (let atual: Element | null = el; atual && atual !== document.body; atual = atual.parentElement) {
    if (getComputedStyle(atual).position === 'fixed') return true;
  }
  return false;
}

function posicaoCartao(r: Retangulo | null): CSSProperties {
  if (!r || window.innerWidth < 768) return {};
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = r.left + r.width + MARGEM;
  if (left + LARGURA_CARTAO > vw - MARGEM) left = Math.max(MARGEM, r.left - MARGEM - LARGURA_CARTAO);
  if (left + LARGURA_CARTAO > vw - MARGEM) left = Math.max(MARGEM, vw - LARGURA_CARTAO - MARGEM);
  const top = Math.min(Math.max(r.top, MARGEM), Math.max(MARGEM, vh - ALTURA_CARTAO - MARGEM));
  return { left, top, width: LARGURA_CARTAO };
}

export default function Tutorial({ onEncerrar }: Props) {
  const [indice, setIndice] = useState(BOAS_VINDAS);
  const [retangulo, setRetangulo] = useState<Retangulo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [emCelular, setEmCelular] = useState(() => window.innerWidth < 768);
  /** No celular o cartão fica no lado oposto ao destaque para não cobrir o elemento. */
  const [cartaoNoTopo, setCartaoNoTopo] = useState(false);
  const dialogoRef = useRef<HTMLDivElement>(null);

  const passo = indice >= 0 && indice < FINAL ? PASSOS_TUTORIAL[indice] : null;

  const sair = useCallback(
    async (concluido: boolean) => {
      if (salvando) return;
      setSalvando(true);
      const falha = await onEncerrar(concluido);
      setSalvando(false);
      if (falha) setErro(falha);
    },
    [onEncerrar, salvando],
  );

  // Restaura o foco para o elemento que estava ativo antes do tutorial abrir.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    return () => anterior?.focus?.();
  }, []);

  // Move o foco para o controle principal de cada etapa.
  useEffect(() => {
    dialogoRef.current?.querySelector<HTMLElement>('[data-foco-inicial]')?.focus();
  }, [indice]);

  // Mede o alvo da etapa atual e o rola para a área visível.
  const medir = useCallback(() => {
    if (!passo) {
      setRetangulo(null);
      return;
    }
    const alvo = buscarAlvo(passo);
    if (!alvo) {
      setRetangulo(null);
      return;
    }
    const r = alvo.getBoundingClientRect();
    setRetangulo({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [passo]);

  // No computador o destaque é centralizado. No celular o cartão ocupa metade da tela e o
  // elemento destacado é levado para a metade livre, para nenhum dos dois cobrir o outro.
  useLayoutEffect(() => {
    const alvo = passo ? buscarAlvo(passo) : null;
    if (!emCelular) {
      alvo?.scrollIntoView({ block: 'center' });
      medir();
      return;
    }

    const alturaCartao = dialogoRef.current?.getBoundingClientRect().height ?? 0;
    const vh = window.innerHeight;
    const r = alvo?.getBoundingClientRect() ?? null;
    const centroAlvo = r ? r.top + r.height / 2 : vh / 2;
    const noTopo = centroAlvo > vh / 2;
    setCartaoNoTopo(noTopo);

    if (r && !estaFixo(alvo!)) {
      const livreTopo = noTopo ? alturaCartao + 24 : 12;
      const livreBase = noTopo ? vh - 12 : vh - alturaCartao - 24;
      const centroLivre = (livreTopo + livreBase) / 2;
      const delta = centroAlvo - centroLivre;
      if (Math.abs(delta) > 8) window.scrollBy({ top: delta });
    }
    medir();
  }, [passo, medir, emCelular]);

  useEffect(() => {
    function aoRedimensionar() {
      setEmCelular(window.innerWidth < 768);
      medir();
    }
    window.addEventListener('resize', aoRedimensionar);
    window.addEventListener('scroll', medir, true);
    return () => {
      window.removeEventListener('resize', aoRedimensionar);
      window.removeEventListener('scroll', medir, true);
    };
  }, [medir]);

  // Escape encerra sem concluir; Tab fica preso dentro do diálogo.
  useEffect(() => {
    function teclado(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        void sair(false);
        return;
      }
      if (e.key !== 'Tab' || !dialogoRef.current) return;
      const focaveis = Array.from(dialogoRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener('keydown', teclado);
    return () => document.removeEventListener('keydown', teclado);
  }, [sair]);

  const ehFinal = indice === FINAL;
  const ehBoasVindas = indice === BOAS_VINDAS;
  const estiloCartao = posicaoCartao(retangulo);

  return (
    <div className="fixed inset-0 z-50">
      {retangulo && passo ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-xl ring-2 ring-indigo-400 transition-all duration-300 motion-reduce:transition-none"
          style={{
            top: retangulo.top - 6,
            left: retangulo.left - 6,
            width: retangulo.width + 12,
            height: retangulo.height + 12,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-slate-950/65" />
      )}

      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-titulo"
        aria-describedby="tutorial-texto"
        style={emCelular ? undefined : estiloCartao}
        className={`fixed z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl transition-[top,bottom,left] duration-300 motion-reduce:transition-none sm:gap-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 ${
          emCelular
            ? `inset-x-2 max-h-[62dvh] overflow-y-auto overscroll-contain ${
                cartaoNoTopo
                  ? 'top-2'
                  : 'bottom-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
              }`
            : ''
        } ${!retangulo && !emCelular ? 'left-1/2 top-1/2 w-[min(90vw,28rem)] -translate-x-1/2 -translate-y-1/2' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          {passo ? (
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Passo {indice + 1} de {FINAL}
            </p>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => void sair(false)}
            aria-label="Fechar tutorial"
            className="-m-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {passo && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden="true">
            <div
              className="h-full rounded-full bg-indigo-600 transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${((indice + 1) / FINAL) * 100}%` }}
            />
          </div>
        )}

        {erro && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            {erro}
          </p>
        )}

        {ehBoasVindas && (
          <>
            <span className="flex size-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
              <GraduationCap className="size-6" aria-hidden />
            </span>
            <div className="flex flex-col gap-2">
              <h2 id="tutorial-titulo" tabIndex={-1} className="text-xl font-bold text-slate-900 dark:text-white">
                Bem-vindo ao As Aulas! 🎓
              </h2>
              <p id="tutorial-texto" className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Tudo o que você precisa para organizar seus estudos está aqui. Vamos conhecer as principais ferramentas da sua área escolar?
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => void sair(false)}
                disabled={salvando}
                className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Agora não
              </button>
              <button
                type="button"
                data-foco-inicial
                onClick={() => setIndice(0)}
                className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Começar tutorial
              </button>
            </div>
          </>
        )}

        {passo && (
          <>
            <div className="flex flex-col gap-2">
              <h2 id="tutorial-titulo" tabIndex={-1} className="text-lg font-bold text-slate-900 dark:text-white">
                {passo.titulo}
              </h2>
              <p id="tutorial-texto" className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {passo.texto}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => void sair(false)}
                disabled={salvando}
                className="min-h-11 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Pular tutorial
              </button>
              <div className="flex gap-2">
                {indice > 0 && (
                  <button
                    type="button"
                    onClick={() => setIndice(passoAnterior(indice))}
                    className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:flex-none dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    Voltar
                  </button>
                )}
                <button
                  type="button"
                  data-foco-inicial
                  onClick={() => setIndice(proximoPasso(indice, FINAL + 1))}
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 sm:flex-none"
                >
                  {indice === FINAL - 1 ? 'Concluir' : 'Próximo'}
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </>
        )}

        {ehFinal && (
          <>
            <div className="flex flex-col gap-2">
              <h2 id="tutorial-titulo" tabIndex={-1} className="text-xl font-bold text-slate-900 dark:text-white">
                Você está pronto para começar! 🚀
              </h2>
              <p id="tutorial-texto" className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Agora você já conhece as principais ferramentas do As Aulas. Consulte suas atividades, organize seu horário e acompanhe sua evolução sempre que precisar.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PASSOS_TUTORIAL.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <span>{p.titulo}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setIndice(passoAnterior(indice))}
                disabled={salvando}
                className="min-h-11 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Rever passos
              </button>
              <button
                type="button"
                data-foco-inicial
                onClick={() => void sair(true)}
                disabled={salvando}
                className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {salvando ? 'Salvando…' : 'Começar a estudar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
