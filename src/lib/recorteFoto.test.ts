import { describe, expect, it } from 'vitest';
import {
  ZOOM_MAX,
  ZOOM_MIN,
  desenharRecorte,
  limitesRecorte,
  limitarAjuste,
  limitarZoom,
} from './recorteFoto';

function contextoFalso() {
  const desenhos: unknown[][] = [];
  let limpou = false;
  const ctx = {
    clearRect: () => {
      limpou = true;
    },
    drawImage: (...args: unknown[]) => {
      desenhos.push(args);
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, desenhos, limpou: () => limpou };
}

describe('limitarZoom', () => {
  it('mantém o zoom dentro da faixa', () => {
    expect(limitarZoom(0.4)).toBe(ZOOM_MIN);
    expect(limitarZoom(9)).toBe(ZOOM_MAX);
    expect(limitarZoom(2)).toBe(2);
  });
});

describe('limitesRecorte', () => {
  it('não deixa mover uma imagem quadrada sem zoom', () => {
    expect(limitesRecorte(800, 800, 1)).toEqual({ maxX: 0, maxY: 0 });
  });

  it('permite mover uma imagem larga só na horizontal', () => {
    const { maxX, maxY } = limitesRecorte(2000, 1000, 1);
    expect(maxX).toBeCloseTo(0.5);
    expect(maxY).toBeCloseTo(0);
  });

  it('aumenta a área de arrasto com o zoom', () => {
    const { maxX } = limitesRecorte(1000, 1000, 2);
    expect(maxX).toBeCloseTo(0.5);
  });
});

describe('limitarAjuste', () => {
  it('prende o deslocamento nos limites da imagem', () => {
    const ajuste = limitarAjuste(2000, 1000, { zoom: 1, x: 2, y: 2 });
    expect(ajuste.x).toBeCloseTo(0.5);
    expect(ajuste.y).toBeCloseTo(0);
  });

  it('aplica o zoom limitado junto com o deslocamento', () => {
    const ajuste = limitarAjuste(1000, 1000, { zoom: 99, x: 0, y: 0 });
    expect(ajuste.zoom).toBe(ZOOM_MAX);
  });
});

describe('desenharRecorte', () => {
  const imagem = {} as CanvasImageSource;

  it('cobre o quadrado inteiro com uma imagem larga', () => {
    const { ctx, desenhos, limpou } = contextoFalso();
    desenharRecorte(ctx, imagem, 2000, 1000, 200, { zoom: 1, x: 0, y: 0 });
    expect(limpou()).toBe(true);
    // escala 0,2 → 400×200; centralizado: x = 100 − 200 = −100
    expect(desenhos[0]).toEqual([imagem, -100, 0, 400, 200]);
  });

  it('aplica o zoom e o deslocamento proporcional ao lado', () => {
    const { ctx, desenhos } = contextoFalso();
    desenharRecorte(ctx, imagem, 1000, 1000, 200, { zoom: 2, x: 0.25, y: -0.1 });
    // escala 0,4 → 400×400; x = 100 − 200 + 50 = −50; y = 100 − 200 − 20 = −120
    expect(desenhos[0]).toEqual([imagem, -50, -120, 400, 400]);
  });
});
