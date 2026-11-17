// Enquadramento da foto de perfil: o deslocamento é guardado em fração do lado
// do recorte, então a prévia pequena e o arquivo final de 512 px usam a mesma conta.

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

export type AjusteRecorte = {
  zoom: number;
  /** Deslocamento horizontal em fração do lado do recorte. */
  x: number;
  /** Deslocamento vertical em fração do lado do recorte. */
  y: number;
};

export function limitarZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/**
 * Quanto a imagem pode andar sem deixar espaço vazio dentro do quadrado.
 * A conta independe do tamanho de exibição: usa a proporção entre os lados.
 */
export function limitesRecorte(largura: number, altura: number, zoom: number): { maxX: number; maxY: number } {
  const z = limitarZoom(zoom);
  const maxX = Math.max(0, (Math.max(1, largura / altura) * z - 1) / 2);
  const maxY = Math.max(0, (Math.max(1, altura / largura) * z - 1) / 2);
  return { maxX, maxY };
}

export function limitarAjuste(largura: number, altura: number, ajuste: AjusteRecorte): AjusteRecorte {
  const zoom = limitarZoom(ajuste.zoom);
  const { maxX, maxY } = limitesRecorte(largura, altura, zoom);
  return {
    zoom,
    x: Math.min(maxX, Math.max(-maxX, ajuste.x)),
    y: Math.min(maxY, Math.max(-maxY, ajuste.y)),
  };
}

/** Escala que faz a imagem cobrir o quadrado inteiro. */
export function escalaDeCobertura(largura: number, altura: number, lado: number): number {
  return Math.max(lado / largura, lado / altura);
}

export function desenharRecorte(
  ctx: CanvasRenderingContext2D,
  imagem: CanvasImageSource,
  larguraImagem: number,
  alturaImagem: number,
  lado: number,
  ajuste: AjusteRecorte,
): void {
  const escala = escalaDeCobertura(larguraImagem, alturaImagem, lado) * ajuste.zoom;
  const largura = larguraImagem * escala;
  const altura = alturaImagem * escala;
  ctx.clearRect(0, 0, lado, lado);
  ctx.drawImage(
    imagem,
    lado / 2 - largura / 2 + ajuste.x * lado,
    lado / 2 - altura / 2 + ajuste.y * lado,
    largura,
    altura,
  );
}

/** Gera o quadrado final em WebP (ou JPEG, se o navegador não souber WebP). */
export async function recortarParaBlob(
  imagem: HTMLImageElement,
  ajuste: AjusteRecorte,
  tamanho = 512,
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  desenharRecorte(ctx, imagem, imagem.naturalWidth, imagem.naturalHeight, tamanho, ajuste);
  const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
  if (webp) return webp;
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
}
