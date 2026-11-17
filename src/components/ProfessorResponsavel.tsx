import { urlPublicaAvatar } from '../lib/avatar';

type Props = {
  nome?: string | null;
  /** Caminho da foto no bucket, caso o professor tenha conta. */
  foto?: string | null;
  prefixo?: string;
  className?: string;
};

const TITULO = /^(prof\.?|profa\.?|professor|professora)$/i;

function iniciaisProfessor(nome: string): string {
  const partes = nome.split(/\s+/).filter((parte) => parte && !TITULO.test(parte));
  return partes
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Professor responsável pela atividade. Como o cadastro de disciplinas guarda só o
 * nome, o avatar é genérico (iniciais em cinza) quando não há foto de conta.
 */
export default function ProfessorResponsavel({ nome, foto, prefixo = 'Professor(a)', className = '' }: Props) {
  const limpo = nome?.trim();
  if (!limpo) return null;
  const url = urlPublicaAvatar(foto);

  return (
    <p className={`flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      <span
        className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-[9px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        aria-hidden="true"
      >
        {url ? <img src={url} alt="" className="size-full object-cover" /> : iniciaisProfessor(limpo) || '?'}
      </span>
      <span className="min-w-0 truncate">
        {prefixo}: <span className="font-medium text-slate-700 dark:text-slate-300">{limpo}</span>
      </span>
    </p>
  );
}
