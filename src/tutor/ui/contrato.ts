// Contrato da interface dinâmica do Tutor IA.
// A IA escolhe entre texto e um conjunto fechado de blocos. Nada vindo do modelo
// é executado: só é renderizado o que passa por esta validação.

export const TIPOS_BLOCO = [
  'text',
  'key_points',
  'steps',
  'alert',
  'formula',
  'comparison',
  'timeline',
  'diagram',
  'fraction',
  'flashcards',
  'multiple_choice',
  'checklist',
] as const;

export type TipoBloco = (typeof TIPOS_BLOCO)[number];

export const ACOES = ['explicar_simples', 'exemplo', 'testar', 'flashcards', 'resumo'] as const;
export type AcaoSugerida = (typeof ACOES)[number];

export type Acao = { rotulo: string; acao: AcaoSugerida };

export type EventoTempo = { data: string; titulo: string; descricao: string };
export type ParteDiagrama = { nome: string; descricao: string };
export type CardUI = { frente: string; verso: string };
export type LinhaComparacao = { rotulo: string; valores: string[] };

export type Bloco =
  | { tipo: 'text'; titulo: string; texto: string }
  | { tipo: 'key_points' | 'steps' | 'checklist'; titulo: string; itens: string[] }
  | { tipo: 'alert'; titulo: string; texto: string }
  | { tipo: 'formula'; titulo: string; texto: string; explicacao: string }
  | { tipo: 'comparison'; titulo: string; colunas: string[]; linhas: LinhaComparacao[] }
  | { tipo: 'timeline'; titulo: string; eventos: EventoTempo[] }
  | { tipo: 'diagram'; titulo: string; partes: ParteDiagrama[]; nota: string }
  | { tipo: 'fraction'; titulo: string; numerador: number; denominador: number; explicacao: string }
  | { tipo: 'flashcards'; titulo: string; cards: CardUI[] }
  | {
      tipo: 'multiple_choice';
      titulo: string;
      pergunta: string;
      opcoes: string[];
      correta: number;
      explicacao: string;
    };

export type InterfaceIA = {
  titulo: string;
  resumo: string;
  blocos: Bloco[];
  acoes: Acao[];
};

const LIMITE_BLOCOS = 8;
const LIMITE_ITENS = 10;

function txt(valor: unknown, max = 2000): string {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

function lista(valor: unknown, max: number, limite: number): string[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .map((item) => txt(item, max))
    .filter((item) => item.length > 0)
    .slice(0, limite);
}

function num(valor: unknown): number {
  const n = typeof valor === 'number' ? Math.trunc(valor) : Number.parseInt(String(valor ?? ''), 10);
  return Number.isFinite(n) ? n : Number.NaN;
}

function ehTipo(valor: unknown): valor is TipoBloco {
  return typeof valor === 'string' && (TIPOS_BLOCO as readonly string[]).includes(valor);
}

function bloco(bruto: unknown): Bloco | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const b = bruto as Record<string, unknown>;
  const kind = b.kind ?? b.tipo;
  if (!ehTipo(kind)) return null;

  const titulo = txt(b.titulo, 160);

  switch (kind) {
    case 'text': {
      const texto = txt(b.texto);
      return texto ? { tipo: 'text', titulo, texto } : null;
    }
    case 'key_points':
    case 'steps':
    case 'checklist': {
      const itens = lista(b.itens, 600, LIMITE_ITENS);
      return itens.length > 0 ? { tipo: kind, titulo, itens } : null;
    }
    case 'alert': {
      const texto = txt(b.texto, 800);
      return texto ? { tipo: 'alert', titulo, texto } : null;
    }
    case 'formula': {
      const texto = txt(b.texto, 300);
      return texto ? { tipo: 'formula', titulo, texto, explicacao: txt(b.explicacao, 1200) } : null;
    }
    case 'comparison': {
      const colunas = lista(b.colunas, 80, 4);
      const linhas: LinhaComparacao[] = [];
      for (const item of Array.isArray(b.linhas) ? b.linhas.slice(0, 8) : []) {
        if (!item || typeof item !== 'object') continue;
        const l = item as Record<string, unknown>;
        const rotulo = txt(l.rotulo, 120);
        const valores = lista(l.valores, 300, colunas.length);
        if (rotulo && valores.length > 0) linhas.push({ rotulo, valores });
      }
      return colunas.length >= 2 && linhas.length > 0 ? { tipo: 'comparison', titulo, colunas, linhas } : null;
    }
    case 'timeline': {
      const eventos: EventoTempo[] = [];
      for (const item of Array.isArray(b.eventos) ? b.eventos.slice(0, 12) : []) {
        if (!item || typeof item !== 'object') continue;
        const e = item as Record<string, unknown>;
        const nome = txt(e.titulo, 160);
        if (!nome) continue;
        eventos.push({ data: txt(e.data, 60), titulo: nome, descricao: txt(e.descricao, 900) });
      }
      return eventos.length > 0 ? { tipo: 'timeline', titulo, eventos } : null;
    }
    case 'diagram': {
      const partes: ParteDiagrama[] = [];
      for (const item of Array.isArray(b.partes) ? b.partes.slice(0, 10) : []) {
        if (!item || typeof item !== 'object') continue;
        const p = item as Record<string, unknown>;
        const nome = txt(p.nome, 80);
        if (!nome) continue;
        partes.push({ nome, descricao: txt(p.descricao, 800) });
      }
      if (partes.length < 2) return null;
      return { tipo: 'diagram', titulo, partes, nota: txt(b.nota, 300) };
    }
    case 'fraction': {
      const numerador = num(b.numerador);
      const denominador = num(b.denominador);
      if (!Number.isInteger(numerador) || !Number.isInteger(denominador)) return null;
      if (denominador < 2 || denominador > 12 || numerador < 0 || numerador > denominador) return null;
      return { tipo: 'fraction', titulo, numerador, denominador, explicacao: txt(b.explicacao, 1200) };
    }
    case 'flashcards': {
      const cards: CardUI[] = [];
      for (const item of Array.isArray(b.cards) ? b.cards.slice(0, 20) : []) {
        if (!item || typeof item !== 'object') continue;
        const c = item as Record<string, unknown>;
        const frente = txt(c.frente, 600);
        const verso = txt(c.verso, 2000);
        if (frente && verso) cards.push({ frente, verso });
      }
      return cards.length > 0 ? { tipo: 'flashcards', titulo, cards } : null;
    }
    case 'multiple_choice': {
      const pergunta = txt(b.pergunta, 1000);
      const opcoes = lista(b.opcoes ?? b.alternativas, 400, 6);
      const correta = num(b.correta);
      if (!pergunta || opcoes.length < 2) return null;
      if (!Number.isInteger(correta) || correta < 0 || correta >= opcoes.length) return null;
      return {
        tipo: 'multiple_choice',
        titulo,
        pergunta,
        opcoes,
        correta,
        explicacao: txt(b.explicacao, 1500),
      };
    }
    default:
      return null;
  }
}

/** Valida o JSON devolvido pela IA. Retorna null quando não há interface segura para renderizar. */
export function validarInterface(bruto: unknown): InterfaceIA | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const dados = bruto as Record<string, unknown>;
  if (dados.tipo !== 'interface') return null;

  const blocos: Bloco[] = [];
  for (const item of Array.isArray(dados.blocos) ? dados.blocos.slice(0, LIMITE_BLOCOS) : []) {
    const valido = bloco(item);
    if (valido) blocos.push(valido);
  }
  if (blocos.length === 0) return null;

  const acoes: Acao[] = [];
  for (const item of Array.isArray(dados.acoes) ? dados.acoes.slice(0, 4) : []) {
    if (!item || typeof item !== 'object') continue;
    const a = item as Record<string, unknown>;
    const rotulo = txt(a.rotulo, 60);
    const acao = a.acao;
    if (!rotulo || typeof acao !== 'string') continue;
    if (!(ACOES as readonly string[]).includes(acao)) continue;
    acoes.push({ rotulo, acao: acao as AcaoSugerida });
  }

  return {
    titulo: txt(dados.titulo, 140) || 'Explicação',
    resumo: txt(dados.resumo, 400),
    blocos,
    acoes,
  };
}
