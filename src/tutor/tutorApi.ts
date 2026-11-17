import { supabase } from '../lib/supabase';
import { validarInterface, type InterfaceIA } from './ui/contrato';

export type Papel = 'user' | 'assistant';
export type Mensagem = { id?: string; role: Papel; content: string; ui?: InterfaceIA | null };

export type ErroTutor = { mensagem: string; codigo?: string };

const MENSAGENS_PADRAO = 'Não foi possível falar com o Tutor IA. Tente novamente.';

// Chama a Edge Function "tutor-ia" com o JWT do aluno (enviado automaticamente pelo cliente Supabase).
export async function invocarTutor(
  body: Record<string, unknown>,
): Promise<{ dados: Record<string, unknown> } | { erro: ErroTutor }> {
  const { data, error } = await supabase.functions.invoke('tutor-ia', { body });

  if (error) {
    // Em respostas não-2xx o corpo com { error, code } fica em error.context.
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const payload = (await context.json()) as { error?: string; code?: string };
        return { erro: { mensagem: payload.error ?? MENSAGENS_PADRAO, codigo: payload.code } };
      } catch {
        // cai na mensagem padrão abaixo
      }
    }
    return { erro: { mensagem: MENSAGENS_PADRAO } };
  }

  if (!data || typeof data !== 'object') return { erro: { mensagem: MENSAGENS_PADRAO } };
  return { dados: data as Record<string, unknown> };
}

export async function chamarTutor(
  body: Record<string, unknown>,
): Promise<{ resposta: string; ui: InterfaceIA | null } | { erro: ErroTutor }> {
  const resultado = await invocarTutor(body);
  if ('erro' in resultado) return resultado;

  const reply = resultado.dados.reply;
  // A interface só é renderizada se passar pela validação do contrato.
  const ui = validarInterface(resultado.dados.ui);

  if (typeof reply !== 'string' && !ui) return { erro: { mensagem: MENSAGENS_PADRAO } };
  return { resposta: typeof reply === 'string' ? reply : '', ui };
}
