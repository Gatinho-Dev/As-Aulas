import { useEffect, useState } from 'react';
import { CalendarDays, FileText, Layers, ListChecks, Trash2 } from 'lucide-react';
import {
  carregarMateriais,
  excluirDeck,
  excluirPlano,
  excluirResumo,
  excluirSimulado,
  type Material,
  type TipoMaterial,
} from './artefatosApi';

const FILTROS: { id: 'todos' | TipoMaterial; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'simulado', label: 'Simulados' },
  { id: 'resumo', label: 'Resumos' },
  { id: 'plano', label: 'Planos' },
];

const ROTULO: Record<TipoMaterial, string> = {
  flashcards: 'Flashcards',
  simulado: 'Simulado',
  resumo: 'Resumo',
  plano: 'Plano',
};

const ICONE = {
  flashcards: Layers,
  simulado: ListChecks,
  resumo: FileText,
  plano: CalendarDays,
} as const;

function dataCurta(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

export default function MeusMateriais({
  onAbrir,
}: {
  onAbrir: (tipo: TipoMaterial, id: string) => void;
}) {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [filtro, setFiltro] = useState<'todos' | TipoMaterial>('todos');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void recarregar();
  }, []);

  async function recarregar() {
    setCarregando(true);
    const resposta = await carregarMateriais();
    if ('erro' in resposta) setErro(resposta.erro);
    else setMateriais(resposta.materiais);
    setCarregando(false);
  }

  async function excluir(material: Material) {
    if (!window.confirm(`Excluir "${material.titulo}"?`)) return;
    const ok =
      material.tipo === 'flashcards'
        ? await excluirDeck(material.id)
        : material.tipo === 'simulado'
          ? await excluirSimulado(material.id)
          : material.tipo === 'resumo'
            ? await excluirResumo(material.id)
            : await excluirPlano(material.id);

    if (!ok) {
      setErro('Não foi possível excluir este material.');
      return;
    }
    await recarregar();
  }

  const visiveis = filtro === 'todos' ? materiais : materiais.filter((m) => m.tipo === filtro);

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filtrar materiais" className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
            className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${
              filtro === f.id
                ? 'bg-indigo-700 text-white'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {f.label}
            {f.id !== 'todos' && (
              <span className="ml-2 text-xs opacity-70">{materiais.filter((m) => m.tipo === f.id).length}</span>
            )}
          </button>
        ))}
      </div>

      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{erro}</p>}

      {carregando ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">Carregando seus materiais…</p>
      ) : visiveis.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          Nada salvo aqui ainda. Use as ferramentas do Tutor IA para gerar flashcards, simulados, resumos e planos.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visiveis.map((material) => {
            const Icone = ICONE[material.tipo];
            const chave = `${material.tipo}-${material.id}`;
            return (
              <li
                key={chave}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                  <Icone className="size-4" aria-hidden /> {ROTULO[material.tipo]}
                </div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{material.titulo}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {material.materia || 'Sem matéria'} · {material.detalhe} · {dataCurta(material.created_at)}
                </p>
                <div className="mt-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onAbrir(material.tipo, material.id)}
                    className="min-h-11 flex-1 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white"
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => void excluir(material)}
                    aria-label={`Excluir ${material.titulo}`}
                    className="inline-flex size-11 items-center justify-center rounded-lg bg-slate-100 text-red-700 dark:bg-slate-800 dark:text-red-300"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
