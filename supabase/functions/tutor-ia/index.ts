// Supabase Edge Function: Tutor IA (Gemini Developer API).
// Operações: "chat", "explain", "flashcards" e "quiz". A chave GEMINI_API_KEY fica somente no servidor.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT =
  'Você é o Tutor IA do As Aulas, um assistente educacional paciente, didático e responsável. ' +
  'Responda em português brasileiro, adapte a explicação ao nível escolar informado e priorize o aprendizado. ' +
  'Explique os conceitos com clareza e exemplos adequados. Em atividades práticas, ajude o estudante a construir ' +
  'o raciocínio em vez de simplesmente entregar respostas. Não invente fatos, fontes ou resultados. ' +
  'Quando houver dúvida ou insuficiência de informações, informe a limitação.';

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY = 10;
const MAX_OUTPUT_TOKENS = 1200;
const MAX_ITENS = 20;
const DAILY_LIMIT = Number(Deno.env.get('TUTOR_DAILY_LIMIT') ?? '30');
// Modelos verificados com a chave do projeto em 22/10/2026: os Flash-Lite responderam
// 200 com respostaSchema válido, enquanto o 3.8 Flash estava em 503 e com cota diária
// esgotada. A cota gratuita do Gemini é contada por modelo, então a cadeia aproveita
// os modelos alternativos quando um deles esgota ou fica sobrecarregado.
const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite';
const MODELOS_FALLBACK = (
  Deno.env.get('GEMINI_MODELOS_FALLBACK') ?? 'gemini-3.1-flash-lite,gemini-flash-lite-latest'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const MODELOS = [MODEL, ...MODELOS_FALLBACK.filter((m) => m !== MODEL)];

type Turn = { role: 'user' | 'assistant'; content: string };
type Falha = { ok: false; status: number; code: string; detalhe?: string };
type Card = { frente: string; verso: string };
type Questao = { enunciado: string; alternativas: string[]; correta: number; explicacao: string };
type Topico = { titulo: string; explicacao: string };
type Semana = { titulo: string; foco: string; tarefas: string[] };
type TipoEstudo = 'flashcards' | 'quiz' | 'resumo' | 'plano';

const SCHEMA_FLASHCARDS = {
  type: 'OBJECT',
  properties: {
    titulo: { type: 'STRING' },
    materia: { type: 'STRING' },
    cards: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { frente: { type: 'STRING' }, verso: { type: 'STRING' } },
        required: ['frente', 'verso'],
      },
    },
  },
  required: ['titulo', 'materia', 'cards'],
};

const SCHEMA_SIMULADO = {
  type: 'OBJECT',
  properties: {
    titulo: { type: 'STRING' },
    materia: { type: 'STRING' },
    questoes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          enunciado: { type: 'STRING' },
          alternativas: { type: 'ARRAY', items: { type: 'STRING' } },
          correta: { type: 'INTEGER' },
          explicacao: { type: 'STRING' },
        },
        required: ['enunciado', 'alternativas', 'correta', 'explicacao'],
      },
    },
  },
  required: ['titulo', 'materia', 'questoes'],
};

const SCHEMA_RESUMO = {
  type: 'OBJECT',
  properties: {
    titulo: { type: 'STRING' },
    materia: { type: 'STRING' },
    topicos: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { titulo: { type: 'STRING' }, explicacao: { type: 'STRING' } },
        required: ['titulo', 'explicacao'],
      },
    },
    pontos_chave: { type: 'ARRAY', items: { type: 'STRING' } },
    resumo_final: { type: 'STRING' },
  },
  required: ['titulo', 'materia', 'topicos', 'pontos_chave', 'resumo_final'],
};

const SCHEMA_PLANO = {
  type: 'OBJECT',
  properties: {
    titulo: { type: 'STRING' },
    materia: { type: 'STRING' },
    objetivo: { type: 'STRING' },
    semanas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          titulo: { type: 'STRING' },
          foco: { type: 'STRING' },
          tarefas: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['titulo', 'foco', 'tarefas'],
      },
    },
  },
  required: ['titulo', 'materia', 'objetivo', 'semanas'],
};

const TIPOS_BLOCO = [
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
];
const ACOES_UI = ['explicar_simples', 'exemplo', 'testar', 'flashcards', 'resumo'];

const SYSTEM_UI =
  '\nFormato: escolha tipo "texto" para perguntas simples e conversa curta; escolha tipo "interface" quando a explicação ganhar com etapas, comparação, linha do tempo, diagrama, frações, flashcards ou questões.' +
  ' Em "interface", preencha titulo, resumo, de 1 a 8 blocos usando apenas os kinds permitidos e de 0 a 4 ações da lista.' +
  ' Regras: nunca invente datas, fontes ou números; sinalize datas aproximadas; avise quando um diagrama é representação simplificada;' +
  ' em multiple_choice use de 3 a 4 alternativas curtas com exatamente uma correta; em fraction use numerador entre 0 e denominador e denominador entre 2 e 12.' +
  ' Sempre preencha "resposta" com uma versão curta em texto do conteúdo. Responda apenas no JSON do formato definido.';

const SCHEMA_BLOCO_UI = {
  type: 'OBJECT',
  properties: {
    kind: { type: 'STRING', enum: TIPOS_BLOCO },
    titulo: { type: 'STRING' },
    texto: { type: 'STRING' },
    itens: { type: 'ARRAY', items: { type: 'STRING' } },
    opcoes: { type: 'ARRAY', items: { type: 'STRING' } },
    correta: { type: 'INTEGER' },
    explicacao: { type: 'STRING' },
    cards: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { frente: { type: 'STRING' }, verso: { type: 'STRING' } },
        required: ['frente', 'verso'],
      },
    },
    eventos: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { data: { type: 'STRING' }, titulo: { type: 'STRING' }, descricao: { type: 'STRING' } },
        required: ['titulo', 'descricao'],
      },
    },
    partes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { nome: { type: 'STRING' }, descricao: { type: 'STRING' } },
        required: ['nome', 'descricao'],
      },
    },
    colunas: { type: 'ARRAY', items: { type: 'STRING' } },
    linhas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { rotulo: { type: 'STRING' }, valores: { type: 'ARRAY', items: { type: 'STRING' } } },
        required: ['rotulo', 'valores'],
      },
    },
    numerador: { type: 'INTEGER' },
    denominador: { type: 'INTEGER' },
    nota: { type: 'STRING' },
  },
  required: ['kind'],
};

const SCHEMA_CHAT = {
  type: 'OBJECT',
  properties: {
    tipo: { type: 'STRING', enum: ['texto', 'interface'] },
    resposta: { type: 'STRING' },
    titulo: { type: 'STRING' },
    resumo: { type: 'STRING' },
    blocos: { type: 'ARRAY', items: SCHEMA_BLOCO_UI },
    acoes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { rotulo: { type: 'STRING' }, acao: { type: 'STRING', enum: ACOES_UI } },
        required: ['rotulo', 'acao'],
      },
    },
  },
  required: ['tipo', 'resposta', 'titulo', 'resumo', 'blocos', 'acoes'],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function texto(valor: unknown, max: number): string {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

function inteiro(valor: unknown, padrao: number, min: number, max: number): number {
  const n = typeof valor === 'number' ? Math.trunc(valor) : Number.parseInt(String(valor ?? ''), 10);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, n));
}

function isTurn(value: unknown): value is Turn {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (v.role === 'user' || v.role === 'assistant') &&
    typeof v.content === 'string' && v.content.trim().length > 0 &&
    v.content.length <= MAX_MESSAGE_CHARS;
}

function buildPrompt(body: Record<string, unknown>): { turns: Turn[]; error?: string } | { error: string } {
  const op = body.operation;
  if (op === 'chat') {
    const history = Array.isArray(body.messages) ? body.messages.slice(-MAX_HISTORY) : [];
    if (!history.every(isTurn)) return { error: 'Mensagens inválidas.' };
    const turns = history as Turn[];
    if (turns.length === 0 || turns[turns.length - 1].role !== 'user') {
      return { error: 'A última mensagem precisa ser do aluno.' };
    }
    return { turns };
  }
  const fields = ['materia', 'serie', 'tema', 'dificuldade', 'tipo', 'duvida'] as const;
  const data: Record<string, string> = {};
  for (const f of fields) data[f] = texto(body[f], 300);
  if (!data.materia || !data.tema) return { error: 'Informe a matéria e o tema.' };
  const text =
    `Explique o tema "${data.tema}" da matéria ${data.materia}` +
    (data.serie ? ` para o nível ${data.serie}` : '') +
    (data.dificuldade ? `, em dificuldade ${data.dificuldade}` : '') +
    (data.tipo ? `, no estilo ${data.tipo}` : '') + '.' +
    ' Estruture em: explicação inicial; conceitos importantes; exemplos práticos; erros comuns; ' +
    'resumo final; e uma pequena atividade para o aluno praticar.' +
    (data.duvida ? ` Dúvida específica do aluno: ${data.duvida}` : '');
  return { turns: [{ role: 'user', content: text }] };
}

// Pedido de flashcards ou simulado: a IA devolve JSON validado pelo schema.
function buildEstudo(
  body: Record<string, unknown>,
  tipo: TipoEstudo,
): { prompt: string; schema: unknown; materia: string } | { error: string } {
  const materia = texto(body.materia, 120);
  const tema = texto(body.tema, 200);
  const serie = texto(body.serie, 120);
  const nivel = texto(body.nivel, 40);
  if (!materia || (tipo !== 'plano' && !tema)) {
    return { error: tipo === 'plano' ? 'Informe a matéria.' : 'Informe a matéria e o tema.' };
  }

  const nivelTexto = nivel ? ` Nível de dificuldade: ${nivel}.` : '';
  const serieTexto = serie ? ` O aluno está em ${serie}.` : '';

  if (tipo === 'flashcards') {
    const quantidade = inteiro(body.quantidade, 8, 3, MAX_ITENS);
    return {
      materia,
      schema: SCHEMA_FLASHCARDS,
      prompt:
        `Monte ${quantidade} flashcards para estudar "${tema}" na matéria ${materia}.${serieTexto}${nivelTexto}` +
        ' Cada cartão deve ter, na frente, uma pergunta curta e objetiva; no verso, a resposta direta com no máximo 60 palavras.' +
        ' Cubra os conceitos essenciais sem repetir cartões e inclua um título curto para a coleção.' +
        ' Responda apenas no JSON do formato definido.',
    };
  }

  if (tipo === 'resumo') {
    return {
      materia,
      schema: SCHEMA_RESUMO,
      prompt:
        `Faça um resumo de estudo sobre "${tema}" na matéria ${materia}.${serieTexto}${nivelTexto}` +
        ' Organize em tópicos com uma explicação objetiva de cada um, liste de 4 a 8 pontos-chave e termine com um resumo final de até 80 palavras.' +
        ' Use linguagem clara, sem inventar dados, e inclua um título curto.' +
        ' Responda apenas no JSON do formato definido.',
    };
  }

  if (tipo === 'plano') {
    const semanas = inteiro(body.quantidade, 4, 1, 12);
    const objetivo = texto(body.objetivo, 300) || tema || `estudar ${materia}`;
    return {
      materia,
      schema: SCHEMA_PLANO,
      prompt:
        `Monte um plano de estudos de ${semanas} semanas para o objetivo "${objetivo}" na matéria ${materia}.${serieTexto}${nivelTexto}` +
        ' Cada semana precisa de um título, um foco principal e de 3 a 5 tarefas práticas e realistas.' +
        ' Progrida do básico ao avançado, inclua revisão e pratique com exercícios. Inclua o objetivo no JSON.' +
        ' Responda apenas no JSON do formato definido.',
    };
  }

  const quantidade = inteiro(body.quantidade, 5, 3, MAX_ITENS);
  return {
    materia,
    schema: SCHEMA_SIMULADO,
    prompt:
      `Monte um simulado com ${quantidade} questões de múltipla escolha sobre "${tema}" na matéria ${materia}.${serieTexto}${nivelTexto}` +
      ' Cada questão precisa de exatamente 4 alternativas, com apenas uma correta, e uma explicação curta do motivo.' +
      ' As alternativas erradas devem ser plausíveis. Não repita questões e inclua um título curto.' +
      ' Responda apenas no JSON do formato definido.',
  };
}

async function postGemini(model: string, apiKey: string, payload: unknown): Promise<Response> {
  return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
  });
}

function falhaHttp(status: number, model: string, corpo: string): Falha {
  const code = status === 429
    ? 'limite_api'
    : status === 401 || status === 403
    ? 'chave_invalida'
    : status === 404
    ? 'modelo_indisponivel'
    : status === 400
    ? 'requisicao_invalida'
    : 'indisponivel';
  console.error('Gemini HTTP', status, model, corpo);
  return { ok: false, status: status === 429 ? 429 : 503, code, detalhe: corpo };
}

async function pedirGemini(model: string, turns: Turn[], apiKey: string): Promise<{ ok: true; text: string } | Falha> {
  let res: Response;
  try {
    res = await postGemini(model, apiKey, {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: turns.map((t) => ({
        role: t.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: t.content }],
      })),
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.6 },
    });
  } catch (e) {
    console.error('Gemini falha de rede', e instanceof Error ? e.message : String(e));
    return { ok: false, status: 503, code: 'indisponivel', detalhe: 'falha de rede' };
  }

  if (!res.ok) return falhaHttp(res.status, model, (await res.text().catch(() => '')).slice(0, 600));

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('').trim();
  if (!text) {
    const motivo = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason ?? 'vazio';
    console.error('Gemini sem texto', model, motivo);
    return { ok: false, status: 502, code: 'resposta_vazia', detalhe: `motivo: ${motivo}` };
  }
  return { ok: true, text };
}

async function pedirGeminiJson(
  model: string,
  prompt: string,
  schema: unknown,
  apiKey: string,
): Promise<{ ok: true; dados: unknown } | Falha> {
  let res: Response;
  try {
    res = await postGemini(model, apiKey, {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        maxOutputTokens: 4096,
        temperature: 0.7,
      },
    });
  } catch (e) {
    console.error('Gemini falha de rede', e instanceof Error ? e.message : String(e));
    return { ok: false, status: 503, code: 'indisponivel', detalhe: 'falha de rede' };
  }

  if (!res.ok) return falhaHttp(res.status, model, (await res.text().catch(() => '')).slice(0, 600));

  const data = await res.json();
  const bruto = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('').trim();
  if (!bruto) {
    const motivo = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason ?? 'vazio';
    console.error('Gemini sem JSON', model, motivo);
    return { ok: false, status: 502, code: 'resposta_vazia', detalhe: `motivo: ${motivo}` };
  }

  try {
    return { ok: true, dados: JSON.parse(bruto) };
  } catch {
    console.error('Gemini JSON inválido', model, bruto.slice(0, 300));
    return { ok: false, status: 502, code: 'resposta_invalida', detalhe: 'JSON inválido' };
  }
}

async function pedirChat(
  model: string,
  turns: Turn[],
  apiKey: string,
): Promise<{ ok: true; dados: unknown } | Falha> {
  let res: Response;
  try {
    res = await postGemini(model, apiKey, {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT + SYSTEM_UI }] },
      contents: turns.map((t) => ({
        role: t.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: t.content }],
      })),
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMA_CHAT,
        maxOutputTokens: 4096,
        temperature: 0.6,
      },
    });
  } catch (e) {
    console.error('Gemini falha de rede', e instanceof Error ? e.message : String(e));
    return { ok: false, status: 503, code: 'indisponivel', detalhe: 'falha de rede' };
  }

  if (!res.ok) return falhaHttp(res.status, model, (await res.text().catch(() => '')).slice(0, 600));

  const data = await res.json();
  const bruto = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('').trim();
  if (!bruto) {
    const motivo = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason ?? 'vazio';
    return { ok: false, status: 502, code: 'resposta_vazia', detalhe: `motivo: ${motivo}` };
  }

  try {
    return { ok: true, dados: JSON.parse(bruto) };
  } catch {
    console.error('Gemini JSON inválido', model, bruto.slice(0, 300));
    return { ok: false, status: 502, code: 'resposta_invalida', detalhe: 'JSON inválido' };
  }
}

// Monta a resposta do chat: texto simples ou texto + interface validada no cliente.
function respostaChat(dados: unknown): { reply: string; ui?: unknown } {
  const d = (dados ?? {}) as Record<string, unknown>;
  const resposta = texto(d.resposta, 8000);

  const blocos = Array.isArray(d.blocos)
    ? d.blocos
        .slice(0, 8)
        .filter((b) => {
          if (!b || typeof b !== 'object') return false;
          const kind = (b as Record<string, unknown>).kind;
          return typeof kind === 'string' && TIPOS_BLOCO.includes(kind);
        })
    : [];

  if (d.tipo !== 'interface' || blocos.length === 0) {
    return { reply: resposta || 'Não consegui responder agora. Tente reformular a pergunta.' };
  }

  const acoes = Array.isArray(d.acoes)
    ? d.acoes
        .slice(0, 4)
        .filter((a) => {
          if (!a || typeof a !== 'object') return false;
          const acao = (a as Record<string, unknown>).acao;
          return typeof acao === 'string' && ACOES_UI.includes(acao);
        })
    : [];

  return {
    reply: resposta,
    ui: { tipo: 'interface', titulo: texto(d.titulo, 140), resumo: texto(d.resumo, 400), blocos, acoes },
  };
}

// Tenta o modelo principal duas vezes e, se o Google estiver sobrecarregado (503),
// percorre os modelos alternativos. Erros de chave/cota não geram repetição.
async function comTentativas<T>(
  apiKey: string,
  tentar: (model: string) => Promise<{ ok: true; valor: T } | Falha>,
): Promise<{ ok: true; valor: T } | Falha> {
  const plano = [MODELOS[0], MODELOS[0], ...MODELOS.slice(1)];
  let ultima: Falha | null = null;

  for (let i = 0; i < plano.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 600));
    const resultado = await tentar(plano[i]);
    if (resultado.ok) return resultado;
    ultima = resultado;
    // Sobrecarga (503) e cota do modelo esgotada (429) valem tentar o próximo modelo:
    // no plano gratuito do Gemini a cota diária é contada por modelo.
    const podeTrocar = resultado.code === 'indisponivel' || resultado.code === 'limite_api';
    if (!podeTrocar) return resultado;
  }

  return ultima ?? { ok: false, status: 503, code: 'indisponivel' };
}

function validarFlashcards(dados: unknown): { titulo: string; materia: string; cards: Card[] } | null {
  if (!dados || typeof dados !== 'object') return null;
  const d = dados as Record<string, unknown>;
  const lista = Array.isArray(d.cards) ? d.cards.slice(0, MAX_ITENS) : [];
  const cards: Card[] = [];
  for (const item of lista) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const frente = texto(c.frente, 600);
    const verso = texto(c.verso, 2000);
    if (frente && verso) cards.push({ frente, verso });
  }
  if (cards.length === 0) return null;
  return { titulo: texto(d.titulo, 120) || 'Flashcards', materia: texto(d.materia, 120), cards };
}

function validarSimulado(dados: unknown): { titulo: string; materia: string; questoes: Questao[] } | null {
  if (!dados || typeof dados !== 'object') return null;
  const d = dados as Record<string, unknown>;
  const lista = Array.isArray(d.questoes) ? d.questoes.slice(0, MAX_ITENS) : [];
  const questoes: Questao[] = [];
  for (const item of lista) {
    if (!item || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;
    const enunciado = texto(q.enunciado, 1200);
    const alternativas = (Array.isArray(q.alternativas) ? q.alternativas : [])
      .map((a) => texto(a, 400))
      .filter((a) => a.length > 0)
      .slice(0, 6);
    const correta = inteiro(q.correta, -1, -1, 9);
    if (!enunciado || alternativas.length < 2) continue;
    if (correta < 0 || correta >= alternativas.length) continue;
    questoes.push({ enunciado, alternativas, correta, explicacao: texto(q.explicacao, 2000) });
  }
  if (questoes.length === 0) return null;
  return { titulo: texto(d.titulo, 120) || 'Simulado', materia: texto(d.materia, 120), questoes };
}

function listaTextos(valor: unknown, max: number, limite: number): string[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .map((item) => texto(item, max))
    .filter((item) => item.length > 0)
    .slice(0, limite);
}

function validarResumo(
  dados: unknown,
): { titulo: string; materia: string; topicos: Topico[]; pontos_chave: string[]; resumo_final: string } | null {
  if (!dados || typeof dados !== 'object') return null;
  const d = dados as Record<string, unknown>;
  const topicos: Topico[] = [];
  for (const item of Array.isArray(d.topicos) ? d.topicos.slice(0, 12) : []) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Record<string, unknown>;
    const titulo = texto(t.titulo, 160);
    const explicacao = texto(t.explicacao, 2000);
    if (titulo && explicacao) topicos.push({ titulo, explicacao });
  }
  if (topicos.length === 0) return null;
  return {
    titulo: texto(d.titulo, 120) || 'Resumo',
    materia: texto(d.materia, 120),
    topicos,
    pontos_chave: listaTextos(d.pontos_chave, 300, 10),
    resumo_final: texto(d.resumo_final, 2000),
  };
}

function validarPlano(
  dados: unknown,
): { titulo: string; materia: string; objetivo: string; semanas: Semana[] } | null {
  if (!dados || typeof dados !== 'object') return null;
  const d = dados as Record<string, unknown>;
  const semanas: Semana[] = [];
  for (const item of Array.isArray(d.semanas) ? d.semanas.slice(0, 12) : []) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    const titulo = texto(s.titulo, 160);
    const foco = texto(s.foco, 500);
    const tarefas = listaTextos(s.tarefas, 300, 8);
    if (titulo && tarefas.length > 0) semanas.push({ titulo, foco, tarefas });
  }
  if (semanas.length === 0) return null;
  return {
    titulo: texto(d.titulo, 120) || 'Plano de estudos',
    materia: texto(d.materia, 120),
    objetivo: texto(d.objetivo, 300),
    semanas,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Faça login para usar o Tutor IA.' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corpo da requisição inválido.' }, 400);
  }

  const op = body.operation;
  const tipoEstudo: TipoEstudo | null =
    op === 'flashcards' || op === 'quiz' || op === 'resumo' || op === 'plano' ? op : null;
  let turns: Turn[] | null = null;
  let estudo: { prompt: string; schema: unknown; materia: string } | null = null;

  if (op === 'chat' || op === 'explain') {
    const prompt = buildPrompt(body);
    if ('error' in prompt) return json({ error: prompt.error }, 400);
    turns = prompt.turns;
  } else if (tipoEstudo) {
    const pedido = buildEstudo(body, tipoEstudo);
    if ('error' in pedido) return json({ error: pedido.error }, 400);
    estudo = pedido;
  } else {
    return json({ error: 'Operação não suportada.' }, 400);
  }

  // O cliente usa o JWT do aluno: RLS e tutor_registrar_uso validam a identidade no banco.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { error: usageError } = await supabase.rpc('tutor_registrar_uso', { p_limite: DAILY_LIMIT });
  if (usageError) {
    if (usageError.message.includes('limite_diario')) {
      return json({ error: 'Você atingiu o limite diário do Tutor IA. Tente novamente amanhã.', code: 'limite_diario' }, 429);
    }
    return json({ error: 'Não foi possível verificar sua sessão.' }, 401);
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return json(
      { error: 'O Tutor IA ainda não está configurado. Peça ao administrador para definir a chave da API.', code: 'sem_chave' },
      503,
    );
  }

  const falha = (result: Falha) => {
    const messages: Record<string, string> = {
      limite_api: 'O limite gratuito da IA foi atingido por enquanto. Tente novamente mais tarde.',
      chave_invalida: 'A chave da IA foi recusada pelo Google. Confira o segredo GEMINI_API_KEY.',
      modelo_indisponivel: 'O modelo de IA configurado não está disponível para esta chave.',
      indisponivel: 'O Tutor IA está temporariamente indisponível. Tente novamente em instantes.',
      resposta_vazia: 'A IA não conseguiu responder. Tente reformular a pergunta.',
      resposta_invalida: 'A IA devolveu um formato inesperado. Tente gerar de novo.',
      requisicao_invalida: 'A IA não aceitou o formato deste pedido. Tente reformular.',
    };
    return json(
      { error: messages[result.code] ?? 'Erro inesperado.', code: result.code, detalhe: result.detalhe },
      result.status,
    );
  };

  if (estudo) {
    const pedido = estudo;
    const gerado = await comTentativas(apiKey, async (model) => {
      const r = await pedirGeminiJson(model, pedido.prompt, pedido.schema, apiKey);
      return r.ok ? { ok: true as const, valor: r.dados } : r;
    });
    if (!gerado.ok) return falha(gerado);

    const dados =
      tipoEstudo === 'flashcards'
        ? validarFlashcards(gerado.valor)
        : tipoEstudo === 'quiz'
        ? validarSimulado(gerado.valor)
        : tipoEstudo === 'resumo'
        ? validarResumo(gerado.valor)
        : validarPlano(gerado.valor);
    if (!dados) {
      return json({ error: 'A IA devolveu um formato inesperado. Tente gerar de novo.', code: 'resposta_invalida' }, 502);
    }
    return json({ tipo: tipoEstudo, dados: { ...dados, materia: dados.materia || pedido.materia } });
  }

  if (op === 'chat') {
    const conversa = await comTentativas(apiKey, async (model) => {
      const r = await pedirChat(model, turns!, apiKey);
      return r.ok ? { ok: true as const, valor: r.dados } : r;
    });
    if (!conversa.ok) return falha(conversa);
    return json(respostaChat(conversa.valor));
  }

  const resultado = await comTentativas(apiKey, async (model) => {
    const r = await pedirGemini(model, turns!, apiKey);
    return r.ok ? { ok: true as const, valor: r.text } : r;
  });
  if (!resultado.ok) return falha(resultado);

  return json({ reply: resultado.valor });
});
