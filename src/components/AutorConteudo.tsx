import type { AutorResumo } from '../lib/pessoa';
import AvatarAluno from './AvatarAluno';

type Props = {
  autor?: AutorResumo | null;
  prefixo?: string;
  className?: string;
};

/** Linha discreta com avatar e nome de quem publicou. Não renderiza nada sem autor. */
export default function AutorConteudo({ autor, prefixo = 'Publicado por', className = '' }: Props) {
  if (!autor) return null;
  return (
    <p className={`flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      <AvatarAluno
        nome={autor.display_name}
        caminho={autor.avatar_path}
        cor={autor.accent_color}
        className="size-5 text-[9px]"
      />
      <span className="min-w-0 truncate">
        {prefixo}{' '}
        <span className="font-medium text-slate-700 dark:text-slate-300">{autor.display_name}</span>
      </span>
    </p>
  );
}
