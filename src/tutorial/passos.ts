export type PassoTutorial = {
  id: string;
  titulo: string;
  texto: string;
  /** Seletores CSS em ordem de preferência; o primeiro visível é destacado. */
  alvos: string[];
};

export const PASSOS_TUTORIAL: PassoTutorial[] = [
  {
    id: 'inicio',
    titulo: 'Este é o seu espaço de estudos',
    texto:
      'Aqui você encontra um resumo do que precisa fazer e pode acessar rapidamente as principais ferramentas.',
    alvos: ['[data-tutorial="inicio"]'],
  },
  {
    id: 'atividades',
    titulo: 'Nunca perca uma atividade',
    texto:
      'Abra uma atividade para ler as instruções, ver a matéria, o prazo, os arquivos anexados e o local de envio.',
    alvos: ['[data-tutorial="atividades"]'],
  },
  {
    id: 'datas',
    titulo: 'Organize suas datas importantes',
    texto: 'No Calendário você consulta suas próximas provas, datas de entrega, trabalhos e apresentações.',
    alvos: ['[data-tutorial="datas"]'],
  },
  {
    id: 'horario',
    titulo: 'Descubra o que você tem em cada dia',
    texto:
      'Consulte as aulas de cada dia, com horários e professores. No celular, use os seletores de dias para alternar.',
    alvos: ['[data-tutorial="horario"]', '[data-tutorial="mais"]'],
  },
  {
    id: 'desempenho',
    titulo: 'Acompanhe sua evolução',
    texto:
      'Veja as notas registradas, o progresso nas matérias e o histórico de avaliações. Algumas informações aparecem somente quando a escola publica os dados.',
    alvos: ['[data-tutorial="desempenho"]', '[data-tutorial="mais"]'],
  },
  {
    id: 'conquistas',
    titulo: 'Defina objetivos e celebre suas conquistas',
    texto: 'Crie metas pessoais de estudo, acompanhe o progresso e desbloqueie conquistas conforme avança.',
    alvos: ['[data-tutorial="conquistas"]', '[data-tutorial="mais"]'],
  },
  {
    id: 'notificacoes',
    titulo: 'Fique por dentro das novidades',
    texto: 'O sino no topo mostra avisos e atualizações de atividades. Toque nele para consultar tudo.',
    alvos: ['[data-tutorial="notificacoes"]'],
  },
];

export function proximoPasso(atual: number, total: number): number {
  return Math.min(atual + 1, total - 1);
}

export function passoAnterior(atual: number): number {
  return Math.max(atual - 1, 0);
}

/** Chave de sessão por aluno: impede reaproveitar o estado de outra conta no mesmo navegador. */
export function chaveSessaoTutorial(userId: string): string {
  return `tutorial-dispensado:${userId}`;
}
