import { BlocoAlerta, BlocoComparacao, BlocoFormula, BlocoLista, BlocoTexto } from './BlocosBasicos';
import { BlocoCartoes, BlocoDiagrama, BlocoFracao, BlocoLinhaTempo, BlocoQuestao } from './BlocosInterativos';
import type { AcaoSugerida, Bloco, InterfaceIA as DadosInterface } from './contrato';

function BlocoUI({ bloco }: { bloco: Bloco }) {
  switch (bloco.tipo) {
    case 'text':
      return <BlocoTexto bloco={bloco} />;
    case 'key_points':
    case 'steps':
    case 'checklist':
      return <BlocoLista bloco={bloco} />;
    case 'alert':
      return <BlocoAlerta bloco={bloco} />;
    case 'formula':
      return <BlocoFormula bloco={bloco} />;
    case 'comparison':
      return <BlocoComparacao bloco={bloco} />;
    case 'timeline':
      return <BlocoLinhaTempo bloco={bloco} />;
    case 'diagram':
      return <BlocoDiagrama bloco={bloco} />;
    case 'fraction':
      return <BlocoFracao bloco={bloco} />;
    case 'flashcards':
      return <BlocoCartoes bloco={bloco} />;
    case 'multiple_choice':
      return <BlocoQuestao bloco={bloco} />;
    default:
      return null;
  }
}

export default function InterfaceDinamica({
  dados,
  onAcao,
}: {
  dados: DadosInterface;
  onAcao: (acao: AcaoSugerida) => void;
}) {
  return (
    <article aria-label={dados.titulo} className="space-y-4">
      <header className="space-y-1">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{dados.titulo}</h3>
        {dados.resumo && <p className="text-sm text-slate-600 dark:text-slate-400">{dados.resumo}</p>}
      </header>

      {dados.blocos.map((bloco, i) => (
        <BlocoUI key={`${bloco.tipo}-${i}`} bloco={bloco} />
      ))}

      {dados.acoes.length > 0 && (
        <footer className="flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
          {dados.acoes.map((acao, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onAcao(acao.acao)}
              className="min-h-11 rounded-lg border border-indigo-300 px-3 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:border-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-950"
            >
              {acao.rotulo}
            </button>
          ))}
        </footer>
      )}
    </article>
  );
}
