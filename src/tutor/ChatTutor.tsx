import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Copy, Plus, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { chamarTutor, type Mensagem } from './tutorApi';
import Markdown from './Markdown';
import InterfaceDinamica from './ui/InterfaceDinamica';
import { validarInterface, type AcaoSugerida } from './ui/contrato';

type Conversa = { id: string; title: string; updated_at: string };

const LIMITE_CARACTERES = 2000;

const SUGESTOES = [
  'Explique frações com exemplos do dia a dia',
  'Como resolver uma equação do 1º grau?',
  'Me ajude a montar um resumo de fotossíntese',
  'Quero treinar redação para o ENEM',
];

// Ações sugeridas pela IA viram uma nova mensagem objetiva para a mesma conversa.
const ACAO_PROMPT: Record<AcaoSugerida, string> = {
  explicar_simples: 'Explique esse mesmo conteúdo de forma mais simples, mantendo o contexto.',
  exemplo: 'Mostre mais um exemplo prático sobre esse mesmo conteúdo.',
  testar: 'Crie questões de múltipla escolha para eu testar o que aprendi sobre esse conteúdo.',
  flashcards: 'Gere flashcards sobre esse conteúdo para eu memorizar.',
  resumo: 'Faça um resumo curto desse conteúdo com os pontos-chave.',
};

export default function ChatTutor({ perguntaInicial }: { perguntaInicial?: string | null } = {}) {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiadaIndex, setCopiadaIndex] = useState<number | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void supabase
      .from('tutor_conversations')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro('Não foi possível carregar suas conversas.');
        else setConversas((data ?? []) as Conversa[]);
      });
  }, []);

  useEffect(() => {
    if (!conversaId) {
      setMensagens([]);
      return;
    }
    void supabase
      .from('tutor_messages')
      .select('id, role, content, ui')
      .eq('conversation_id', conversaId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) setErro('Não foi possível abrir esta conversa.');
        else {
          // Revalida a interface salva antes de renderizar novamente.
          const salvas = ((data ?? []) as (Mensagem & { ui?: unknown })[]).map((m) => ({
            ...m,
            ui: validarInterface(m.ui),
          }));
          setMensagens(salvas);
        }
      });
  }, [conversaId]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens, enviando]);

  function novaConversa() {
    setConversaId(null);
    setMensagens([]);
    setErro(null);
  }

  useEffect(() => {
    if (perguntaInicial) setTexto(perguntaInicial);
  }, [perguntaInicial]);

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    await enviarConteudo(texto);
  }

  async function enviarConteudo(entrada: string) {
    const conteudo = entrada.trim();
    if (!conteudo || enviando) return;
    if (conteudo.length > LIMITE_CARACTERES) {
      setErro(`Sua mensagem tem limite de ${LIMITE_CARACTERES} caracteres.`);
      return;
    }

    setErro(null);
    setEnviando(true);
    setTexto('');
    const historico: Mensagem[] = [...mensagens, { role: 'user', content: conteudo }];
    setMensagens(historico);

    try {
      // Garante uma conversa salva antes de gravar as mensagens.
      let id = conversaId;
      if (!id) {
        const titulo = conteudo.slice(0, 60);
        const { data, error } = await supabase
          .from('tutor_conversations')
          .insert({ title: titulo })
          .select('id, title, updated_at')
          .single();
        if (error || !data) throw new Error('conversa');
        id = (data as Conversa).id;
        setConversaId(id);
        setConversas((atual) => [data as Conversa, ...atual]);
      }

      await supabase.from('tutor_messages').insert({ conversation_id: id, role: 'user', content: conteudo });

      const resultado = await chamarTutor({
        operation: 'chat',
        messages: historico.map(({ role, content }) => ({ role, content })),
      });

      if ('erro' in resultado) {
        setErro(resultado.erro.mensagem);
        setMensagens((atual) => atual.slice(0, -1));
        setTexto(conteudo);
        return;
      }

      // A interface vem validada do contrato; o texto garante o histórico legível.
      const conteudoResposta = resultado.resposta || resultado.ui?.titulo || 'Conteúdo gerado pelo Tutor IA.';
      const resposta: Mensagem = { role: 'assistant', content: conteudoResposta, ui: resultado.ui };
      await supabase.from('tutor_messages').insert({
        conversation_id: id,
        role: 'assistant',
        content: resposta.content,
        ui: resultado.ui ?? null,
      });
      setMensagens((atual) => [...atual, resposta]);
    } catch (err) {
      setErro(
        err instanceof Error && err.message === 'conversa'
          ? 'Não foi possível criar a conversa. Tente novamente.'
          : 'Falha de conexão. Sua mensagem foi preservada; tente enviar de novo.',
      );
      setMensagens((atual) => atual.slice(0, -1));
      setTexto(conteudo);
    } finally {
      setEnviando(false);
    }
  }

  function tratarTecla(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void enviar();
    }
  }

  async function copiar(conteudo: string, index: number) {
    await navigator.clipboard.writeText(conteudo);
    setCopiadaIndex(index);
  }

  return (
    <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
      <aside className="space-y-2">
        <button
          type="button"
          onClick={novaConversa}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
        >
          <Plus className="size-4" aria-hidden /> Nova conversa
        </button>
        <ul className="max-h-64 space-y-1 overflow-y-auto" aria-label="Suas conversas">
          {conversas.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setConversaId(c.id)}
                aria-current={c.id === conversaId ? 'true' : undefined}
                className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm ${c.id === conversaId ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
              >
                {c.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section aria-label="Conversa" className="flex min-h-[28rem] flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {mensagens.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                O que você quer estudar hoje? Envie sua dúvida abaixo ou comece por uma sugestão.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGESTOES.map((sugestao) => (
                  <button
                    key={sugestao}
                    type="button"
                    onClick={() => setTexto(sugestao)}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-indigo-300"
                  >
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mensagens.map((m, i) => (
            <div key={i} className={`max-w-[90%] rounded-xl px-4 py-3 text-sm ${m.role === 'user' ? 'ml-auto bg-indigo-700 text-white' : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'}`}>
              {m.role === 'user' ? (
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              ) : m.ui ? (
                <InterfaceDinamica dados={m.ui} onAcao={(acao) => void enviarConteudo(ACAO_PROMPT[acao])} />
              ) : (
                <Markdown texto={m.content} />
              )}
              {m.role === 'assistant' && (
                <button
                  type="button"
                  onClick={() => void copiar(m.content, i)}
                  className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300"
                >
                  <Copy className="size-3.5" aria-hidden /> {copiadaIndex === i ? 'Copiado' : 'Copiar'}
                </button>
              )}
            </div>
          ))}
          {enviando && <p role="status" className="text-sm text-slate-500">O Tutor está pensando…</p>}
          <div ref={fimRef} />
        </div>

        {erro && <p role="alert" className="mx-4 mb-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{erro}</p>}

        <form onSubmit={enviar} className="flex items-end gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
          <label htmlFor="mensagem-tutor" className="sr-only">Sua pergunta</label>
          <textarea
            id="mensagem-tutor"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={tratarTecla}
            rows={2}
            maxLength={LIMITE_CARACTERES}
            placeholder="Digite sua dúvida (Enter envia, Shift + Enter quebra a linha)"
            className="min-h-11 flex-1 resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Send className="size-4" aria-hidden /> Enviar
          </button>
        </form>
      </section>
    </div>
  );
}
