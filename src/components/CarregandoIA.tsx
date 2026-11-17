import { ThinkingOrb } from 'thinking-orbs';

/** Carregamento das telas de IA, com a esfera de "pensando" da libraries.dev. */
export default function CarregandoIA({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <ThinkingOrb state="working" size={32} />
      {texto}
    </p>
  );
}
