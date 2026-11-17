import type { ReactNode } from 'react';
import { CORES_PERFIL, FONTES_PERFIL, type CorPerfil, type FontePerfil } from '../lib/perfilEstilo';

export function iniciaisDe(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

type Props = {
  nome: string;
  nick?: string | null;
  fotoUrl?: string | null;
  bio: string;
  cor: CorPerfil;
  fonte: FontePerfil;
  papel?: string;
  nivel?: 1 | 2;
  placeholderBio?: string;
  legenda?: ReactNode;
};

/**
 * Perfil sem moldura e sem banner: o avatar, o nome e a bio ficam soltos sobre o
 * fundo da página, com um halo suave na cor escolhida.
 */
export default function PreviaPerfil({
  nome,
  nick,
  fotoUrl,
  bio,
  cor,
  fonte,
  papel = 'Aluno',
  nivel = 2,
  placeholderBio = 'Você ainda não escreveu uma bio.',
  legenda,
}: Props) {
  const c = CORES_PERFIL[cor];
  const f = FONTES_PERFIL[fonte];
  const Titulo = (nivel === 1 ? 'h1' : 'h2') as 'h1' | 'h2';
  const bioLimpa = bio.trim();
  const nomeLimpo = nome.trim();

  return (
    <div className="max-w-md">
      <div className="relative inline-flex">
        <span className={`absolute -inset-5 rounded-full blur-2xl ${c.brilho}`} aria-hidden="true" />
        <span
          className={`relative flex size-24 items-center justify-center overflow-hidden rounded-full text-2xl font-semibold ${c.avatar} ${f.classe}`}
          aria-hidden="true"
        >
          {fotoUrl ? (
            <img src={fotoUrl} alt="" className="size-full object-cover" />
          ) : (
            iniciaisDe(nomeLimpo) || '?'
          )}
        </span>
      </div>

      <Titulo className={`mt-5 break-words text-3xl font-bold leading-tight ${c.texto} ${f.classe}`}>
        {nomeLimpo || 'Seu nome'}
      </Titulo>

      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-500 dark:text-slate-400">
        {nick && <span className="font-medium">@{nick}</span>}
        {nick && <span aria-hidden="true">·</span>}
        <span>{papel}</span>
      </p>

      <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Sobre mim
        </p>
        <p
          className={`mt-2 whitespace-pre-line break-words text-sm leading-relaxed ${
            bioLimpa ? 'text-slate-700 dark:text-slate-300' : 'italic text-slate-400 dark:text-slate-500'
          }`}
        >
          {bioLimpa || placeholderBio}
        </p>
      </div>

      {legenda && (
        <p className="mt-5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{legenda}</p>
      )}
    </div>
  );
}
