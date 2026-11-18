import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../auth/AuthContext';

export type MinhaTurma = {
  class_id: string;
  name: string;
  school_year: number;
  shift: string | null;
};

export function useTurmaPrincipal() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [minhasTurmas, setMinhasTurmas] = useState<MinhaTurma[] | null>(null);
  const [principalId, setPrincipalId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!userId) {
      setMinhasTurmas(null);
      setPrincipalId(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    const [memRes, prefRes] = await Promise.all([
      supabase
        .from('class_memberships')
        .select('class_id, classes(id, name, school_year, shift)')
        .eq('user_id', userId)
        .eq('membership_status', 'ativo'),
      supabase.from('user_preferences').select('preferred_class_id').eq('user_id', userId).maybeSingle(),
    ]);
    if (memRes.error) {
      setErro('Não foi possível carregar suas turmas.');
      setMinhasTurmas([]);
      setCarregando(false);
      return;
    }
    const lista = ((memRes.data ?? []) as { class_id: string; classes: { name: string; school_year: number; shift: string | null } | { name: string; school_year: number; shift: string | null }[] | null }[]).map(
      (m) => {
        const rel = Array.isArray(m.classes) ? m.classes[0] : m.classes;
        return {
          class_id: m.class_id,
          name: rel?.name ?? 'Minha turma',
          school_year: rel?.school_year ?? 0,
          shift: rel?.shift ?? null,
        };
      },
    );
    setMinhasTurmas(lista);
    const pref = prefRes.data?.preferred_class_id as string | undefined;
    setPrincipalId(pref && lista.some((t) => t.class_id === pref) ? pref : (lista[0]?.class_id ?? null));
    setCarregando(false);
  }, [userId]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  async function definirPrincipal(turmaId: string): Promise<string | null> {
    if (!userId) return 'Sessão expirada. Entre novamente.';
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: userId, preferred_class_id: turmaId }, { onConflict: 'user_id' });
    if (error) return 'Não foi possível trocar a turma principal. Verifique se você está nela e tente de novo.';
    setPrincipalId(turmaId);
    // Avisa outras telas abertas na mesma aba/navegação.
    window.dispatchEvent(new CustomEvent('turma-principal-mudou', { detail: turmaId }));
    return null;
  }

  async function entrarEAtivar(turmaId: string): Promise<string | null> {
    const { error } = await supabase.rpc('escolher_minha_turma', { p_class_id: turmaId });
    if (error) return 'Não foi possível entrar na turma. Tente novamente.';
    await recarregar();
    // Quem entra numa turma nova já passa a ver o site inteiro nela.
    return definirPrincipal(turmaId);
  }

  const principal = minhasTurmas?.find((t) => t.class_id === principalId) ?? null;

  return { minhasTurmas, principalId, principal, carregando, erro, recarregar, definirPrincipal, entrarEAtivar };
}
