import { supabase } from '../lib/supabase';
import { invocarTutor, type ErroTutor } from './tutorApi';

export type Card = { frente: string; verso: string };
export type Questao = { enunciado: string; alternativas: string[]; correta: number; explicacao: string };
export type PedidoEstudo = {
  materia: string;
  tema: string;
  serie?: string;
  nivel?: string;
  quantidade?: number;
  objetivo?: string;
};

export type Topico = { titulo: string; explicacao: string };
export type ResumoDados = { topicos: Topico[]; pontos_chave: string[]; resumo_final: string };
export type Semana = { titulo: string; foco: string; tarefas: string[] };
export type PlanoDados = { objetivo: string; semanas: Semana[] };

export type Resumo = {
  id: string;
  titulo: string;
  materia: string;
  created_at: string;
  dados: ResumoDados;
};

export type Plano = {
  id: string;
  titulo: string;
  materia: string;
  objetivo: string;
  created_at: string;
  dados: PlanoDados;
};

export type TipoMaterial = 'flashcards' | 'simulado' | 'resumo' | 'plano';

export type Material = {
  tipo: TipoMaterial;
  id: string;
  titulo: string;
  materia: string;
  created_at: string;
  detalhe: string;
};

export type StatusCartao = 'novo' | 'sabido' | 'revisar';

export type Deck = {
  id: string;
  titulo: string;
  materia: string;
  created_at: string;
  total: number;
};

export type Cartao = {
  id: string;
  deck_id: string;
  frente: string;
  verso: string;
  ordem: number;
  status: StatusCartao;
};

export type Resultado = {
  acertos: number;
  total: number;
  respostas: (number | null)[];
  em: string;
};

export type Simulado = {
  id: string;
  titulo: string;
  materia: string;
  created_at: string;
  ultimo_resultado: Resultado | null;
  total: number;
};

export type QuestaoSalva = {
  id: string;
  quiz_id: string;
  enunciado: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
  ordem: number;
};

const ERRO_SALVAR = 'Não foi possível salvar. Tente novamente.';

function textoDe(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function cardsDe(valor: unknown): Card[] {
  if (!Array.isArray(valor)) return [];
  const cards: Card[] = [];
  for (const item of valor) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const frente = textoDe(c.frente);
    const verso = textoDe(c.verso);
    if (frente && verso) cards.push({ frente, verso });
  }
  return cards;
}

function questoesDe(valor: unknown): Questao[] {
  if (!Array.isArray(valor)) return [];
  const questoes: Questao[] = [];
  for (const item of valor) {
    if (!item || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;
    const enunciado = textoDe(q.enunciado);
    const alternativas = Array.isArray(q.alternativas)
      ? q.alternativas.map(textoDe).filter((a) => a.length > 0)
      : [];
    const correta = typeof q.correta === 'number' ? q.correta : Number.parseInt(String(q.correta ?? ''), 10);
    if (!enunciado || alternativas.length < 2) continue;
    if (!Number.isInteger(correta) || correta < 0 || correta >= alternativas.length) continue;
    questoes.push({ enunciado, alternativas, correta, explicacao: textoDe(q.explicacao) });
  }
  return questoes;
}

// ---------- geração pela IA ----------

export async function gerarFlashcards(
  pedido: PedidoEstudo,
): Promise<{ titulo: string; materia: string; cards: Card[] } | { erro: ErroTutor }> {
  const resultado = await invocarTutor({ operation: 'flashcards', ...pedido });
  if ('erro' in resultado) return resultado;

  const dados = resultado.dados.dados as Record<string, unknown> | undefined;
  const cards = cardsDe(dados?.cards);
  if (cards.length === 0) {
    return { erro: { mensagem: 'A IA não devolveu flashcards válidos. Tente gerar de novo.' } };
  }
  return { titulo: textoDe(dados?.titulo) || 'Flashcards', materia: textoDe(dados?.materia), cards };
}

export async function gerarSimulado(
  pedido: PedidoEstudo,
): Promise<{ titulo: string; materia: string; questoes: Questao[] } | { erro: ErroTutor }> {
  const resultado = await invocarTutor({ operation: 'quiz', ...pedido });
  if ('erro' in resultado) return resultado;

  const dados = resultado.dados.dados as Record<string, unknown> | undefined;
  const questoes = questoesDe(dados?.questoes);
  if (questoes.length === 0) {
    return { erro: { mensagem: 'A IA não devolveu um simulado válido. Tente gerar de novo.' } };
  }
  return { titulo: textoDe(dados?.titulo) || 'Simulado', materia: textoDe(dados?.materia), questoes };
}

// ---------- flashcards salvos ----------

export async function salvarDeck(
  titulo: string,
  materia: string,
  cards: Card[],
): Promise<{ id: string } | { erro: string }> {
  const { data, error } = await supabase
    .from('tutor_decks')
    .insert({ titulo: titulo.slice(0, 120), materia: materia.slice(0, 120) })
    .select('id')
    .single();
  if (error || !data) return { erro: ERRO_SALVAR };

  const deckId = (data as { id: string }).id;
  const linhas = cards.map((c, i) => ({
    deck_id: deckId,
    frente: c.frente,
    verso: c.verso,
    ordem: i,
  }));
  const { error: erroCartoes } = await supabase.from('tutor_deck_cards').insert(linhas);
  if (erroCartoes) {
    await supabase.from('tutor_decks').delete().eq('id', deckId);
    return { erro: ERRO_SALVAR };
  }
  return { id: deckId };
}

export async function carregarDecks(): Promise<{ decks: Deck[] } | { erro: string }> {
  const { data, error } = await supabase
    .from('tutor_decks')
    .select('id, titulo, materia, created_at, tutor_deck_cards(count)')
    .order('created_at', { ascending: false });
  if (error) return { erro: 'Não foi possível carregar seus flashcards.' };

  const decks = ((data ?? []) as unknown as (Omit<Deck, 'total'> & { tutor_deck_cards: { count: number }[] })[]).map(
    (d) => ({
      id: d.id,
      titulo: d.titulo,
      materia: d.materia,
      created_at: d.created_at,
      total: d.tutor_deck_cards?.[0]?.count ?? 0,
    }),
  );
  return { decks };
}

export async function carregarCartoes(deckId: string): Promise<{ cartoes: Cartao[] } | { erro: string }> {
  const { data, error } = await supabase
    .from('tutor_deck_cards')
    .select('id, deck_id, frente, verso, ordem, status')
    .eq('deck_id', deckId)
    .order('ordem', { ascending: true });
  if (error) return { erro: 'Não foi possível abrir esta coleção.' };
  return { cartoes: (data ?? []) as Cartao[] };
}

export async function marcarCartao(id: string, status: StatusCartao): Promise<boolean> {
  const { error } = await supabase
    .from('tutor_deck_cards')
    .update({ status, revisado_em: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

export async function excluirDeck(id: string): Promise<boolean> {
  const { error } = await supabase.from('tutor_decks').delete().eq('id', id);
  return !error;
}

// ---------- simulados salvos ----------

export async function salvarSimulado(
  titulo: string,
  materia: string,
  questoes: Questao[],
): Promise<{ id: string } | { erro: string }> {
  const { data, error } = await supabase
    .from('tutor_quizzes')
    .insert({ titulo: titulo.slice(0, 120), materia: materia.slice(0, 120) })
    .select('id')
    .single();
  if (error || !data) return { erro: ERRO_SALVAR };

  const quizId = (data as { id: string }).id;
  const linhas = questoes.map((q, i) => ({
    quiz_id: quizId,
    enunciado: q.enunciado,
    alternativas: q.alternativas,
    correta: q.correta,
    explicacao: q.explicacao,
    ordem: i,
  }));
  const { error: erroQuestoes } = await supabase.from('tutor_quiz_questions').insert(linhas);
  if (erroQuestoes) {
    await supabase.from('tutor_quizzes').delete().eq('id', quizId);
    return { erro: ERRO_SALVAR };
  }
  return { id: quizId };
}

export async function carregarSimulados(): Promise<{ simulados: Simulado[] } | { erro: string }> {
  const { data, error } = await supabase
    .from('tutor_quizzes')
    .select('id, titulo, materia, created_at, ultimo_resultado, tutor_quiz_questions(count)')
    .order('created_at', { ascending: false });
  if (error) return { erro: 'Não foi possível carregar seus simulados.' };

  const simulados = (
    (data ?? []) as unknown as (Omit<Simulado, 'total'> & { tutor_quiz_questions: { count: number }[] })[]
  ).map((s) => ({
    id: s.id,
    titulo: s.titulo,
    materia: s.materia,
    created_at: s.created_at,
    ultimo_resultado: s.ultimo_resultado,
    total: s.tutor_quiz_questions?.[0]?.count ?? 0,
  }));
  return { simulados };
}

export async function carregarQuestoes(quizId: string): Promise<{ questoes: QuestaoSalva[] } | { erro: string }> {
  const { data, error } = await supabase
    .from('tutor_quiz_questions')
    .select('id, quiz_id, enunciado, alternativas, correta, explicacao, ordem')
    .eq('quiz_id', quizId)
    .order('ordem', { ascending: true });
  if (error) return { erro: 'Não foi possível abrir este simulado.' };
  return { questoes: (data ?? []) as QuestaoSalva[] };
}

export async function salvarResultado(quizId: string, resultado: Resultado): Promise<boolean> {
  const { error } = await supabase
    .from('tutor_quizzes')
    .update({ ultimo_resultado: resultado })
    .eq('id', quizId);
  return !error;
}

export async function excluirSimulado(id: string): Promise<boolean> {
  const { error } = await supabase.from('tutor_quizzes').delete().eq('id', id);
  return !error;
}

// ---------- resumos ----------

function topicosDe(valor: unknown): Topico[] {
  if (!Array.isArray(valor)) return [];
  const topicos: Topico[] = [];
  for (const item of valor) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Record<string, unknown>;
    const titulo = textoDe(t.titulo);
    const explicacao = textoDe(t.explicacao);
    if (titulo && explicacao) topicos.push({ titulo, explicacao });
  }
  return topicos;
}

function resumoDe(dados: unknown): ResumoDados | null {
  if (!dados || typeof dados !== 'object') return null;
  const d = dados as Record<string, unknown>;
  const topicos = topicosDe(d.topicos);
  if (topicos.length === 0) return null;
  const pontos = Array.isArray(d.pontos_chave) ? d.pontos_chave.map(textoDe).filter((p) => p.length > 0) : [];
  return { topicos, pontos_chave: pontos, resumo_final: textoDe(d.resumo_final) };
}

export async function gerarResumo(
  pedido: PedidoEstudo,
): Promise<{ titulo: string; materia: string; dados: ResumoDados } | { erro: ErroTutor }> {
  const resultado = await invocarTutor({ operation: 'resumo', ...pedido });
  if ('erro' in resultado) return resultado;

  const bruto = resultado.dados.dados as Record<string, unknown> | undefined;
  const dados = resumoDe(bruto);
  if (!dados) return { erro: { mensagem: 'A IA não devolveu um resumo válido. Tente gerar de novo.' } };
  return { titulo: textoDe(bruto?.titulo) || 'Resumo', materia: textoDe(bruto?.materia), dados };
}

export async function salvarResumo(
  titulo: string,
  materia: string,
  dados: ResumoDados,
): Promise<{ id: string } | { erro: string }> {
  const { data, error } = await supabase
    .from('tutor_resumos')
    .insert({ titulo: titulo.slice(0, 120), materia: materia.slice(0, 120), dados })
    .select('id')
    .single();
  if (error || !data) return { erro: ERRO_SALVAR };
  return { id: (data as { id: string }).id };
}

export async function carregarResumos(): Promise<{ resumos: Resumo[] } | { erro: string }> {
  const { data, error } = await supabase
    .from('tutor_resumos')
    .select('id, titulo, materia, created_at, dados')
    .order('created_at', { ascending: false });
  if (error) return { erro: 'Não foi possível carregar seus resumos.' };
  return { resumos: (data ?? []) as Resumo[] };
}

export async function excluirResumo(id: string): Promise<boolean> {
  const { error } = await supabase.from('tutor_resumos').delete().eq('id', id);
  return !error;
}

// ---------- planos de estudo ----------

function planoDe(valor: unknown): PlanoDados | null {
  if (!valor || typeof valor !== 'object') return null;
  const d = valor as Record<string, unknown>;
  const semanas: Semana[] = [];
  for (const item of Array.isArray(d.semanas) ? d.semanas : []) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    const titulo = textoDe(s.titulo);
    const tarefas = Array.isArray(s.tarefas) ? s.tarefas.map(textoDe).filter((t) => t.length > 0) : [];
    if (titulo && tarefas.length > 0) semanas.push({ titulo, foco: textoDe(s.foco), tarefas });
  }
  if (semanas.length === 0) return null;
  return { objetivo: textoDe(d.objetivo), semanas };
}

export async function gerarPlano(
  pedido: PedidoEstudo,
): Promise<{ titulo: string; materia: string; objetivo: string; dados: PlanoDados } | { erro: ErroTutor }> {
  const resultado = await invocarTutor({ operation: 'plano', ...pedido });
  if ('erro' in resultado) return resultado;

  const bruto = resultado.dados.dados as Record<string, unknown> | undefined;
  const dados = planoDe(bruto);
  if (!dados) return { erro: { mensagem: 'A IA não devolveu um plano válido. Tente gerar de novo.' } };
  return {
    titulo: textoDe(bruto?.titulo) || 'Plano de estudos',
    materia: textoDe(bruto?.materia),
    objetivo: textoDe(bruto?.objetivo),
    dados,
  };
}

export async function salvarPlano(
  titulo: string,
  materia: string,
  objetivo: string,
  dados: PlanoDados,
): Promise<{ id: string } | { erro: string }> {
  const { data, error } = await supabase
    .from('tutor_planos')
    .insert({
      titulo: titulo.slice(0, 120),
      materia: materia.slice(0, 120),
      objetivo: objetivo.slice(0, 300),
      dados,
    })
    .select('id')
    .single();
  if (error || !data) return { erro: ERRO_SALVAR };
  return { id: (data as { id: string }).id };
}

export async function carregarPlanos(): Promise<{ planos: Plano[] } | { erro: string }> {
  const { data, error } = await supabase
    .from('tutor_planos')
    .select('id, titulo, materia, objetivo, created_at, dados')
    .order('created_at', { ascending: false });
  if (error) return { erro: 'Não foi possível carregar seus planos.' };
  return { planos: (data ?? []) as Plano[] };
}

export async function excluirPlano(id: string): Promise<boolean> {
  const { error } = await supabase.from('tutor_planos').delete().eq('id', id);
  return !error;
}

// ---------- visão geral ----------

function hojeBrasilia(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export type VisaoGeral = {
  conversas: number;
  flashcards: number;
  simulados: number;
  resumos: number;
  planos: number;
  usadosHoje: number;
};

async function contar(tabela: string): Promise<number> {
  const { count } = await supabase.from(tabela).select('id', { count: 'exact', head: true });
  return count ?? 0;
}

export async function carregarVisaoGeral(): Promise<VisaoGeral> {
  const [conversas, flashcards, simulados, resumos, planos, uso] = await Promise.all([
    contar('tutor_conversations'),
    contar('tutor_decks'),
    contar('tutor_quizzes'),
    contar('tutor_resumos'),
    contar('tutor_planos'),
    supabase.from('tutor_ai_usage').select('requests').eq('usage_date', hojeBrasilia()).maybeSingle(),
  ]);

  return {
    conversas,
    flashcards,
    simulados,
    resumos,
    planos,
    usadosHoje: (uso.data as { requests?: number } | null)?.requests ?? 0,
  };
}

export async function carregarMateriais(): Promise<{ materiais: Material[] } | { erro: string }> {
  const [decks, quizzes, resumos, planos] = await Promise.all([
    carregarDecks(),
    carregarSimulados(),
    carregarResumos(),
    carregarPlanos(),
  ]);

  const materiais: Material[] = [];
  if ('decks' in decks) {
    for (const d of decks.decks) {
      materiais.push({
        tipo: 'flashcards',
        id: d.id,
        titulo: d.titulo,
        materia: d.materia,
        created_at: d.created_at,
        detalhe: `${d.total} cartões`,
      });
    }
  }
  if ('simulados' in quizzes) {
    for (const s of quizzes.simulados) {
      materiais.push({
        tipo: 'simulado',
        id: s.id,
        titulo: s.titulo,
        materia: s.materia,
        created_at: s.created_at,
        detalhe: s.ultimo_resultado
          ? `${s.total} questões · último: ${s.ultimo_resultado.acertos}/${s.ultimo_resultado.total}`
          : `${s.total} questões`,
      });
    }
  }
  if ('resumos' in resumos) {
    for (const r of resumos.resumos) {
      materiais.push({
        tipo: 'resumo',
        id: r.id,
        titulo: r.titulo,
        materia: r.materia,
        created_at: r.created_at,
        detalhe: `${r.dados.topicos.length} tópicos`,
      });
    }
  }
  if ('planos' in planos) {
    for (const p of planos.planos) {
      materiais.push({
        tipo: 'plano',
        id: p.id,
        titulo: p.titulo,
        materia: p.materia,
        created_at: p.created_at,
        detalhe: `${p.dados.semanas.length} semanas`,
      });
    }
  }

  if (materiais.length === 0) {
    const falhou = [decks, quizzes, resumos, planos].every((r) => 'erro' in r);
    if (falhou) return { erro: 'Não foi possível carregar seus materiais.' };
  }

  materiais.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { materiais };
}
