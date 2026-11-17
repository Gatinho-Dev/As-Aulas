// Opções fixas de personalização do perfil. As classes ficam escritas por extenso
// para que o Tailwind as gere no build.

export type CorPerfil = 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
export type FontePerfil = 'padrao' | 'serifada' | 'monoespaco';

export const CORES_PERFIL: Record<
  CorPerfil,
  { nome: string; avatar: string; texto: string; bolinha: string; brilho: string }
> = {
  indigo: {
    nome: 'Índigo',
    avatar: 'bg-indigo-700 text-white',
    texto: 'text-indigo-800 dark:text-indigo-300',
    bolinha: 'bg-indigo-700',
    brilho: 'bg-indigo-700/25',
  },
  emerald: {
    nome: 'Esmeralda',
    avatar: 'bg-emerald-600 text-white',
    texto: 'text-emerald-800 dark:text-emerald-300',
    bolinha: 'bg-emerald-600',
    brilho: 'bg-emerald-600/25',
  },
  amber: {
    nome: 'Âmbar',
    avatar: 'bg-amber-500 text-amber-950',
    texto: 'text-amber-800 dark:text-amber-300',
    bolinha: 'bg-amber-500',
    brilho: 'bg-amber-500/25',
  },
  rose: {
    nome: 'Rosa',
    avatar: 'bg-rose-600 text-white',
    texto: 'text-rose-800 dark:text-rose-300',
    bolinha: 'bg-rose-600',
    brilho: 'bg-rose-600/25',
  },
  violet: {
    nome: 'Violeta',
    avatar: 'bg-violet-600 text-white',
    texto: 'text-violet-800 dark:text-violet-300',
    bolinha: 'bg-violet-600',
    brilho: 'bg-violet-600/25',
  },
  slate: {
    nome: 'Grafite',
    avatar: 'bg-slate-600 text-white',
    texto: 'text-slate-800 dark:text-slate-300',
    bolinha: 'bg-slate-600',
    brilho: 'bg-slate-600/25',
  },
};

export const FONTES_PERFIL: Record<FontePerfil, { nome: string; classe: string; exemplo: string }> = {
  padrao: { nome: 'Padrão', classe: 'font-sans', exemplo: 'Clara e direta' },
  serifada: { nome: 'Serifada', classe: 'font-serif', exemplo: 'Com personalidade' },
  monoespaco: { nome: 'Monoespaçada', classe: 'font-mono', exemplo: 'Estilo caderno' },
};

export function corValida(valor: string | null | undefined): CorPerfil {
  return valor && valor in CORES_PERFIL ? (valor as CorPerfil) : 'indigo';
}

export function fonteValida(valor: string | null | undefined): FontePerfil {
  return valor && valor in FONTES_PERFIL ? (valor as FontePerfil) : 'padrao';
}
