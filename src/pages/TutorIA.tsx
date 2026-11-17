import { useEffect, useState, type ComponentType, type FormEvent } from 'react';
import {
  BookOpen,
  CalendarDays,
  FileText,
  FolderOpen,
  GraduationCap,
  Home,
  Layers,
  ListChecks,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { BotAvatar } from 'bot-avatars';
import { BorderBeam } from 'border-beam';
import ChatTutor from '../tutor/ChatTutor';
import ExplicarMateria from '../tutor/ExplicarMateria';
import Flashcards from '../tutor/Flashcards';
import Simulado from '../tutor/Simulado';
import Resumo from '../tutor/Resumo';
import PlanoEstudos from '../tutor/PlanoEstudos';
import MeusMateriais from '../tutor/MeusMateriais';
import { carregarVisaoGeral, type TipoMaterial, type VisaoGeral } from '../tutor/artefatosApi';

type Aba = 'inicio' | 'chat' | 'explicar' | 'flashcards' | 'simulado' | 'resumo' | 'plano' | 'materiais';

type ItemAba = { id: Aba; label: string; icon: ComponentType<{ className?: string }> };

const ABAS: ItemAba[] = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'chat', label: 'Conversar', icon: MessageCircle },
  { id: 'explicar', label: 'Explicar', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'simulado', label: 'Simulado', icon: ListChecks },
  { id: 'resumo', label: 'Resumo', icon: FileText },
  { id: 'plano', label: 'Plano de estudos', icon: CalendarDays },
  { id: 'materiais', label: 'Meus materiais', icon: FolderOpen },
];

const ACESSOS: { aba: Aba; titulo: string; descricao: string; icon: ComponentType<{ className?: string }> }[] = [
  {
    aba: 'explicar',
    titulo: 'Aprender',
    descricao: 'Explicações organizadas, com exemplos e atividade final.',
    icon: BookOpen,
  },
  {
    aba: 'simulado',
    titulo: 'Praticar',
    descricao: 'Exercícios e questões com correção e explicação.',
    icon: ListChecks,
  },
  {
    aba: 'flashcards',
    titulo: 'Memorizar',
    descricao: 'Flashcards para revisar o que você já estudou.',
    icon: Layers,
  },
  {
    aba: 'plano',
    titulo: 'Preparar para provas',
    descricao: 'Plano semanal de revisão e simulados para treinar.',
    icon: CalendarDays,
  },
];

const PERGUNTAS_RAPIDAS = [
  'Me explique frações',
  'Crie exercícios de equação do 1º grau',
  'Monte flashcards de fotossíntese',
  'Me ajude a estudar para a prova de história',
];

const ABA_DO_MATERIAL: Record<TipoMaterial, Aba> = {
  flashcards: 'flashcards',
  simulado: 'simulado',
  resumo: 'resumo',
  plano: 'plano',
};

function CartaoEstatistica({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-900">
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{valor}</p>
      <p className="text-xs text-slate-600 dark:text-slate-400">{rotulo}</p>
    </div>
  );
}

function Inicio({ onIr, onPerguntar }: { onIr: (aba: Aba) => void; onPerguntar: (texto: string) => void }) {
  const [visao, setVisao] = useState<VisaoGeral | null>(null);
  const [texto, setTexto] = useState('');

  useEffect(() => {
    void carregarVisaoGeral().then(setVisao);
  }, []);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const limpo = texto.trim();
    if (limpo) onPerguntar(limpo);
  }

  return (
    <div className="space-y-6">
      <BorderBeam className="rounded-2xl" colorVariant="ocean" theme="auto">
      <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 dark:border-indigo-900 dark:from-indigo-950 dark:to-slate-900">
        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
          <Sparkles className="size-4" aria-hidden /> Tutor IA
        </div>
        <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">O que você quer aprender hoje?</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-700 dark:text-slate-300">
          Escreva em linguagem natural: a IA escolhe se responde em texto, monta uma explicação com etapas, uma linha do
          tempo, um diagrama, flashcards ou uma questão para você responder.
        </p>
        <form onSubmit={enviar} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="pergunta-inicial" className="sr-only">
            O que você quer aprender hoje?
          </label>
          <input
            id="pergunta-inicial"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={2000}
            placeholder="Ex.: me explique frações com uma atividade"
            className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={!texto.trim()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
          >
            <MessageCircle className="size-4" aria-hidden /> Começar
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {PERGUNTAS_RAPIDAS.map((sugestao) => (
            <button
              key={sugestao}
              type="button"
              onClick={() => onPerguntar(sugestao)}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-indigo-300"
            >
              {sugestao}
            </button>
          ))}
        </div>
      </section>
      </BorderBeam>

      {visao && (
        <section aria-label="Seu uso do Tutor IA" className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Seu material</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <CartaoEstatistica rotulo="Conversas" valor={visao.conversas} />
            <CartaoEstatistica rotulo="Flashcards" valor={visao.flashcards} />
            <CartaoEstatistica rotulo="Simulados" valor={visao.simulados} />
            <CartaoEstatistica rotulo="Resumos" valor={visao.resumos} />
            <CartaoEstatistica rotulo="Planos" valor={visao.planos} />
            <CartaoEstatistica rotulo="Usos hoje" valor={visao.usadosHoje} />
          </div>
        </section>
      )}

      <section aria-label="Formas de estudar" className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Formas de estudar</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACESSOS.map((atalho) => (
            <button
              key={atalho.aba}
              type="button"
              onClick={() => onIr(atalho.aba)}
              className="flex h-full flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-400 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <atalho.icon className="size-5 text-indigo-700 dark:text-indigo-300" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">{atalho.titulo}</span>
              <span className="text-xs text-slate-600 dark:text-slate-400">{atalho.descricao}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => onIr('materiais')}
            className="flex h-full flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-400 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <FolderOpen className="size-5 text-indigo-700 dark:text-indigo-300" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">Meus materiais</span>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Tudo salvo em um só lugar, com filtro por tipo.
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}

export default function TutorIA() {
  const [aba, setAba] = useState<Aba>('inicio');
  const [abrirId, setAbrirId] = useState<string | null>(null);
  const [pergunta, setPergunta] = useState<string | null>(null);

  function irPara(destino: Aba) {
    setAbrirId(null);
    setAba(destino);
  }

  function perguntar(texto: string) {
    setAbrirId(null);
    setPergunta(texto);
    setAba('chat');
  }

  function abrirMaterial(tipo: TipoMaterial, id: string) {
    setAbrirId(id);
    setAba(ABA_DO_MATERIAL[tipo]);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center gap-3">
        <BotAvatar type="clover" size={44} state="default" aria-hidden />
        <GraduationCap className="size-7 text-indigo-700 dark:text-indigo-300" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tutor IA</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Seu espaço de estudo com inteligência artificial.</p>
        </div>
      </header>

      <nav
        role="tablist"
        aria-label="Ferramentas do Tutor"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={aba === item.id}
            onClick={() => irPara(item.id)}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
              aba === item.id
                ? 'bg-indigo-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </button>
        ))}
      </nav>

      {aba === 'inicio' && <Inicio onIr={irPara} onPerguntar={perguntar} />}
      {aba === 'chat' && <ChatTutor perguntaInicial={pergunta} />}
      {aba === 'explicar' && <ExplicarMateria />}
      {aba === 'flashcards' && <Flashcards abrirId={abrirId} />}
      {aba === 'simulado' && <Simulado abrirId={abrirId} />}
      {aba === 'resumo' && <Resumo abrirId={abrirId} />}
      {aba === 'plano' && <PlanoEstudos abrirId={abrirId} />}
      {aba === 'materiais' && <MeusMateriais onAbrir={abrirMaterial} />}
    </div>
  );
}
