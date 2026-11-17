import { useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, RotateCcw, XCircle } from 'lucide-react';
import Markdown from '../Markdown';
import type { Bloco } from './contrato';
import { compararFracoes, descreverFracao, limitarFracao, simplificar, valorDecimal, type Fracao } from './fracoes';

const CARTAO = 'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900';
const BOTAO_BASE =
  'min-h-11 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1';

export function BlocoQuestao({ bloco }: { bloco: Extract<Bloco, { tipo: 'multiple_choice' }> }) {
  const [escolha, setEscolha] = useState<number | null>(null);
  const respondida = escolha !== null;

  return (
    <section className={CARTAO} aria-label="Questão">
      {bloco.titulo && <h4 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{bloco.titulo}</h4>}
      <p className="whitespace-pre-wrap text-sm font-medium text-slate-900 dark:text-slate-100">{bloco.pergunta}</p>

      <div className="mt-3 space-y-2" role="group" aria-label="Alternativas">
        {bloco.opcoes.map((opcao, i) => {
          const correta = respondida && i === bloco.correta;
          const errada = respondida && escolha === i && i !== bloco.correta;
          return (
            <button
              key={i}
              type="button"
              aria-pressed={escolha === i}
              onClick={() => setEscolha(i)}
              className={`${BOTAO_BASE} flex w-full items-start gap-2 border text-left ${
                correta
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
                  : errada
                    ? 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100'
                    : escolha === i
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100'
                      : 'border-slate-300 text-slate-800 hover:border-indigo-400 dark:border-slate-700 dark:text-slate-200'
              }`}
            >
              <span className="font-semibold">{String.fromCharCode(65 + i)})</span>
              <span className="flex-1">{opcao}</span>
              {correta && <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-label="Resposta correta" />}
              {errada && <XCircle className="size-5 shrink-0 text-red-600" aria-label="Resposta incorreta" />}
            </button>
          );
        })}
      </div>

      {respondida && (
        <div className="mt-3 space-y-2">
          <p
            role="status"
            className={`text-sm font-semibold ${
              escolha === bloco.correta ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
            }`}
          >
            {escolha === bloco.correta ? 'Você acertou.' : `Não foi essa. A correta é a letra ${String.fromCharCode(65 + bloco.correta)}.`}
          </p>
          {bloco.explicacao && (
            <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              <Markdown texto={bloco.explicacao} />
            </div>
          )}
          <button type="button" onClick={() => setEscolha(null)} className={`${BOTAO_BASE} bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200`}>
            Tentar de novo
          </button>
        </div>
      )}
    </section>
  );
}

export function BlocoLinhaTempo({ bloco }: { bloco: Extract<Bloco, { tipo: 'timeline' }> }) {
  const [aberto, setAberto] = useState<number | null>(0);

  return (
    <section aria-label="Linha do tempo">
      {bloco.titulo && <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{bloco.titulo}</h4>}
      <ol className="relative space-y-2 border-l-2 border-indigo-200 pl-4 dark:border-indigo-900">
        {bloco.eventos.map((evento, i) => {
          const expandido = aberto === i;
          return (
            <li key={i} className="relative">
              <span
                aria-hidden
                className="absolute -left-[1.4rem] top-3 size-2.5 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-slate-900"
              />
              <button
                type="button"
                onClick={() => setAberto(expandido ? null : i)}
                aria-expanded={expandido}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:border-slate-700 dark:bg-slate-900"
              >
                <span className="block text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                  {evento.data || 'Data não informada'}
                </span>
                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{evento.titulo}</span>
                {expandido && evento.descricao && (
                  <span className="mt-2 block text-sm text-slate-700 dark:text-slate-300">
                    <Markdown texto={evento.descricao} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function BlocoDiagrama({ bloco }: { bloco: Extract<Bloco, { tipo: 'diagram' }> }) {
  const [selecionada, setSelecionada] = useState(0);
  const parte = bloco.partes[selecionada];

  return (
    <section aria-label="Diagrama">
      {bloco.titulo && <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{bloco.titulo}</h4>}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <ol className="flex flex-wrap gap-2">
          {bloco.partes.map((item, i) => (
            <li key={i}>
              <button
                type="button"
                aria-pressed={selecionada === i}
                onClick={() => setSelecionada(i)}
                className={`${BOTAO_BASE} border ${
                  selecionada === i
                    ? 'border-indigo-600 bg-indigo-700 text-white'
                    : 'border-slate-300 bg-white text-slate-800 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                <span className="mr-1 text-xs opacity-80">{i + 1}</span>
                {item.nome}
              </button>
            </li>
          ))}
        </ol>

        {parte && (
          <div className="mt-3 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{parte.nome}</p>
            <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">
              <Markdown texto={parte.descricao} />
            </div>
          </div>
        )}

        {bloco.nota && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{bloco.nota}</p>}
      </div>
    </section>
  );
}

function BarraFracao({ fracao }: { fracao: Fracao }) {
  const partes = Array.from({ length: fracao.denominador }, (_, i) => i < fracao.numerador);
  return (
    <div
      className="flex h-10 w-full overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600"
      role="img"
      aria-label={`${fracao.numerador} de ${fracao.denominador} partes pintadas`}
    >
      {partes.map((pintada, i) => (
        <span
          key={i}
          className={`flex-1 border-r border-slate-300 last:border-r-0 dark:border-slate-600 ${
            pintada ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'
          }`}
        />
      ))}
    </div>
  );
}

function ControleFracao({
  rotulo,
  fracao,
  onChange,
}: {
  rotulo: string;
  fracao: Fracao;
  onChange: (fracao: Fracao) => void;
}) {
  const simplificada = simplificar(fracao);
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {rotulo}: {fracao.numerador}/{fracao.denominador}
      </p>
      <BarraFracao fracao={fracao} />
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
        Numerador: {fracao.numerador}
        <input
          type="range"
          min={0}
          max={fracao.denominador}
          value={fracao.numerador}
          onChange={(e) => onChange(limitarFracao(Number(e.target.value), fracao.denominador))}
          className="mt-1 w-full accent-indigo-700"
        />
      </label>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
        Denominador: {fracao.denominador}
        <input
          type="range"
          min={2}
          max={12}
          value={fracao.denominador}
          onChange={(e) => onChange(limitarFracao(fracao.numerador, Number(e.target.value)))}
          className="mt-1 w-full accent-indigo-700"
        />
      </label>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        {descreverFracao(fracao)} Forma simplificada: {simplificada.numerador}/{simplificada.denominador}.
      </p>
    </div>
  );
}

export function BlocoFracao({ bloco }: { bloco: Extract<Bloco, { tipo: 'fraction' }> }) {
  const [a, setA] = useState<Fracao>(() => limitarFracao(bloco.numerador, bloco.denominador));
  const [b, setB] = useState<Fracao>({ numerador: 1, denominador: 2 });
  const comparacao = compararFracoes(a, b);
  const relacao = comparacao === 0 ? 'é igual a' : comparacao < 0 ? 'é menor que' : 'é maior que';

  return (
    <section aria-label="Explorador de frações" className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{bloco.titulo || 'Explorador de frações'}</h4>
      {bloco.explicacao && (
        <div className="mt-1 text-sm text-slate-800 dark:text-slate-200">
          <Markdown texto={bloco.explicacao} />
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ControleFracao rotulo="Fração A" fracao={a} onChange={setA} />
        <ControleFracao rotulo="Fração B" fracao={b} onChange={setB} />
      </div>

      <p className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm font-medium text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100">
        {a.numerador}/{a.denominador} ({valorDecimal(a).toFixed(2)}) {relacao} {b.numerador}/{b.denominador} (
        {valorDecimal(b).toFixed(2)}).
      </p>
    </section>
  );
}

export function BlocoCartoes({ bloco }: { bloco: Extract<Bloco, { tipo: 'flashcards' }> }) {
  const [indice, setIndice] = useState(0);
  const [virado, setVirado] = useState(false);
  const [status, setStatus] = useState<('novo' | 'sei' | 'revisar')[]>(() => bloco.cards.map(() => 'novo'));

  const card = bloco.cards[indice];
  const vistos = status.filter((s) => s !== 'novo').length;

  function marcar(novo: 'sei' | 'revisar') {
    setStatus((atual) => atual.map((s, i) => (i === indice ? novo : s)));
    setIndice((i) => Math.min(bloco.cards.length - 1, i + 1));
    setVirado(false);
  }

  return (
    <section aria-label="Flashcards da explicação" className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{bloco.titulo || 'Flashcards'}</h4>
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {indice + 1} de {bloco.cards.length} · {vistos} revisados
        </span>
      </div>

      <button
        type="button"
        onClick={() => setVirado((v) => !v)}
        aria-label={virado ? 'Mostrar pergunta' : 'Mostrar resposta'}
        className="mt-3 min-h-40 w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800"
      >
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
          {virado ? 'Resposta' : 'Pergunta'}
        </span>
        {virado ? (
          <span className="block text-sm text-slate-900 dark:text-slate-100">
            <Markdown texto={card.verso} />
          </span>
        ) : (
          <span className="block whitespace-pre-wrap text-sm font-medium text-slate-900 dark:text-slate-100">{card.frente}</span>
        )}
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => marcar('revisar')} className={`${BOTAO_BASE} bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200`}>
          Preciso revisar
        </button>
        <button type="button" onClick={() => marcar('sei')} className={`${BOTAO_BASE} bg-emerald-600 text-white`}>
          Sei
        </button>
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setIndice((i) => Math.max(0, i - 1));
              setVirado(false);
            }}
            disabled={indice === 0}
            aria-label="Cartão anterior"
            className={`${BOTAO_BASE} inline-flex size-11 items-center justify-center bg-slate-100 text-slate-800 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200`}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              setIndice((i) => Math.min(bloco.cards.length - 1, i + 1));
              setVirado(false);
            }}
            disabled={indice === bloco.cards.length - 1}
            aria-label="Próximo cartão"
            className={`${BOTAO_BASE} inline-flex size-11 items-center justify-center bg-slate-100 text-slate-800 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200`}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              setIndice(0);
              setVirado(false);
              setStatus(bloco.cards.map(() => 'novo'));
            }}
            aria-label="Recomeçar cartões"
            className={`${BOTAO_BASE} inline-flex size-11 items-center justify-center bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200`}
          >
            <RotateCcw className="size-4" aria-hidden />
          </button>
        </span>
      </div>
    </section>
  );
}
