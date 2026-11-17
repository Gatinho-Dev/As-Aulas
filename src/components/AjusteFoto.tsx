import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  ZOOM_MAX,
  ZOOM_MIN,
  desenharRecorte,
  limitarAjuste,
  recortarParaBlob,
  type AjusteRecorte,
} from '../lib/recorteFoto';

const LADO = 260;

type Props = {
  arquivo: File;
  onAplicar: (blob: Blob) => void;
  onCancelar: () => void;
};

export default function AjusteFoto({ arquivo, onAplicar, onCancelar }: Props) {
  const [imagem, setImagem] = useState<HTMLImageElement | null>(null);
  const [ajuste, setAjuste] = useState<AjusteRecorte>({ zoom: 1, x: 0, y: 0 });
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arrasto = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let ativo = true;
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      if (!ativo) return;
      setImagem(img);
      setAjuste({ zoom: 1, x: 0, y: 0 });
    };
    img.onerror = () => {
      if (ativo) setErro('Não foi possível abrir esta imagem. Escolha outro arquivo.');
    };
    img.src = url;
    return () => {
      ativo = false;
      URL.revokeObjectURL(url);
    };
  }, [arquivo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imagem) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ladoFisico = Math.round(LADO * dpr);
    if (canvas.width !== ladoFisico) {
      canvas.width = ladoFisico;
      canvas.height = ladoFisico;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    desenharRecorte(ctx, imagem, imagem.naturalWidth, imagem.naturalHeight, LADO, ajuste);
  }, [imagem, ajuste]);

  const dimensoes = imagem ? { largura: imagem.naturalWidth, altura: imagem.naturalHeight } : null;

  function ajustar(mudanca: Partial<AjusteRecorte>) {
    if (!dimensoes) return;
    setAjuste((atual) =>
      limitarAjuste(dimensoes.largura, dimensoes.altura, { ...atual, ...mudanca }),
    );
  }

  function iniciarArrasto(e: PointerEvent<HTMLCanvasElement>) {
    if (!imagem) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    arrasto.current = { x: e.clientX, y: e.clientY };
  }

  function moverArrasto(e: PointerEvent<HTMLCanvasElement>) {
    if (!arrasto.current || !dimensoes) return;
    // O canvas pode ser exibido menor que o tamanho interno; o arrasto usa o tamanho visível.
    const ladoVisivel = e.currentTarget.getBoundingClientRect().width || LADO;
    const dx = (e.clientX - arrasto.current.x) / ladoVisivel;
    const dy = (e.clientY - arrasto.current.y) / ladoVisivel;
    arrasto.current = { x: e.clientX, y: e.clientY };
    setAjuste((atual) =>
      limitarAjuste(dimensoes.largura, dimensoes.altura, {
        ...atual,
        x: atual.x + dx,
        y: atual.y + dy,
      }),
    );
  }

  function terminarArrasto() {
    arrasto.current = null;
  }

  function aoTeclar(e: KeyboardEvent<HTMLCanvasElement>) {
    const passo = e.shiftKey ? 0.06 : 0.015;
    const direcoes: Record<string, [number, number]> = {
      ArrowLeft: [-passo, 0],
      ArrowRight: [passo, 0],
      ArrowUp: [0, -passo],
      ArrowDown: [0, passo],
    };
    const direcao = direcoes[e.key];
    if (!direcao) return;
    e.preventDefault();
    ajustar({ x: ajuste.x + direcao[0], y: ajuste.y + direcao[1] });
  }

  async function aplicar() {
    if (!imagem || gerando) return;
    setGerando(true);
    setErro(null);
    const blob = await recortarParaBlob(imagem, ajuste);
    setGerando(false);
    if (!blob) {
      setErro('Não foi possível preparar a foto. Tente outra imagem.');
      return;
    }
    onAplicar(blob);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <p className="text-sm font-semibold">Enquadrar foto</p>
      <p id="recorte-dica" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Arraste a imagem para escolher o centro. Use o zoom para aproximar — o resultado é circular no perfil.
      </p>

      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="w-full max-w-[260px] rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5 dark:bg-slate-950 dark:ring-white/10">
          <canvas
            ref={canvasRef}
            tabIndex={0}
            aria-label="Área de enquadramento da foto. Arraste ou use as setas do teclado para mover."
            aria-describedby="recorte-dica"
            onPointerDown={iniciarArrasto}
            onPointerMove={moverArrasto}
            onPointerUp={terminarArrasto}
            onPointerCancel={terminarArrasto}
            onKeyDown={aoTeclar}
            className="block aspect-square w-full max-w-[260px] cursor-grab touch-none rounded-full bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:cursor-grabbing dark:bg-slate-800"
          />
        </div>

        <div className="w-full max-w-xs space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="zoom-foto" className="text-xs font-medium">
                Zoom
              </label>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {Math.round(ajuste.zoom * 100)}%
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => ajustar({ zoom: ajuste.zoom - 0.1 })}
                disabled={!imagem || ajuste.zoom <= ZOOM_MIN}
                aria-label="Diminuir zoom"
                className="rounded-lg border border-slate-300 p-1.5 hover:bg-white disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <Minus className="size-3.5" aria-hidden="true" />
              </button>
              <input
                id="zoom-foto"
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={0.01}
                value={ajuste.zoom}
                disabled={!imagem}
                onChange={(e) => ajustar({ zoom: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-700 dark:bg-slate-700"
              />
              <button
                type="button"
                onClick={() => ajustar({ zoom: ajuste.zoom + 0.1 })}
                disabled={!imagem || ajuste.zoom >= ZOOM_MAX}
                aria-label="Aumentar zoom"
                className="rounded-lg border border-slate-300 p-1.5 hover:bg-white disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <Plus className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={aplicar}
              disabled={!imagem || gerando}
              className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
            >
              {gerando ? 'Preparando…' : 'Usar foto'}
            </button>
            <button
              type="button"
              onClick={onCancelar}
              disabled={gerando}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-white disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>

          <button
            type="button"
            onClick={() => ajustar({ zoom: 1, x: 0, y: 0 })}
            disabled={!imagem}
            className="text-xs font-medium text-indigo-800 hover:underline disabled:opacity-40 dark:text-indigo-300"
          >
            Centralizar
          </button>
        </div>
      </div>

      {erro && (
        <p role="alert" className="mt-3 text-xs text-red-700 dark:text-red-300">
          {erro}
        </p>
      )}
    </div>
  );
}
