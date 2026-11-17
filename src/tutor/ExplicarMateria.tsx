import { useState, type FormEvent } from 'react';
import { MetalFx } from 'metal-fx';
import { chamarTutor } from './tutorApi';
import Markdown from './Markdown';

const DIFICULDADES = ['fácil', 'média', 'avançada'];
const TIPOS = ['simples', 'passo a passo', 'com exemplos', 'aprofundada'];

export default function ExplicarMateria() {
  const [materia, setMateria] = useState('');
  const [serie, setSerie] = useState('');
  const [tema, setTema] = useState('');
  const [dificuldade, setDificuldade] = useState(DIFICULDADES[1]);
  const [tipo, setTipo] = useState(TIPOS[1]);
  const [duvida, setDuvida] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resposta, setResposta] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (carregando || !materia.trim() || !tema.trim()) return;
    setCarregando(true);
    setErro(null);
    const resultado = await chamarTutor({
      operation: 'explain',
      materia: materia.trim(),
      serie: serie.trim(),
      tema: tema.trim(),
      dificuldade,
      tipo,
      duvida: duvida.trim(),
    });
    setCarregando(false);
    if ('erro' in resultado) {
      setErro(resultado.erro.mensagem);
      setResposta(null);
    } else {
      setResposta(resultado.resposta);
    }
  }

  const campo = 'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';

  return (
    <div className="space-y-4">
      <form onSubmit={enviar} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
        <label className="text-sm font-medium">
          Matéria *
          <input className={campo} value={materia} onChange={(e) => setMateria(e.target.value)} maxLength={300} required />
        </label>
        <label className="text-sm font-medium">
          Série ou nível
          <input className={campo} value={serie} onChange={(e) => setSerie(e.target.value)} maxLength={300} placeholder="Ex.: 8º ano do fundamental" />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Tema *
          <input className={campo} value={tema} onChange={(e) => setTema(e.target.value)} maxLength={300} required />
        </label>
        <label className="text-sm font-medium">
          Dificuldade
          <select className={campo} value={dificuldade} onChange={(e) => setDificuldade(e.target.value)}>
            {DIFICULDADES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          Tipo de explicação
          <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Dúvida específica (opcional)
          <textarea className={campo} rows={2} value={duvida} onChange={(e) => setDuvida(e.target.value)} maxLength={300} />
        </label>
        <MetalFx variant="button" preset="silver" theme="light" className="sm:col-span-2 sm:justify-self-start">
          <button
            type="submit"
            disabled={carregando || !materia.trim() || !tema.trim()}
            className="min-h-11 rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {carregando ? 'Gerando explicação…' : 'Explicar matéria'}
          </button>
        </MetalFx>
      </form>

      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{erro}</p>}
      {resposta && (
        <article aria-label="Explicação" className="rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
          <Markdown texto={resposta} />
        </article>
      )}
    </div>
  );
}
