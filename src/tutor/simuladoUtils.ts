export type Correcao = {
  acertos: number;
  total: number;
  acertou: boolean[];
};

/** Compara as respostas marcadas (null = em branco) com o índice correto de cada questão. */
export function corrigirSimulado(corretas: number[], respostas: (number | null)[]): Correcao {
  const acertou = corretas.map((correta, i) => respostas[i] === correta);
  return {
    acertos: acertou.filter(Boolean).length,
    total: corretas.length,
    acertou,
  };
}

export function percentual(correcao: Correcao): number {
  if (correcao.total === 0) return 0;
  return Math.round((correcao.acertos / correcao.total) * 100);
}
