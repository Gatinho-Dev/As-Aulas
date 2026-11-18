/** Grade horária oficial do 6º ano D. Semente inicial da tabela class_schedules;
 *  a página "Meu Horário" lê a grade da turma do aluno no banco. */

export type Materia = 'LP' | 'MAT' | 'HIS' | 'GEO' | 'CIE' | 'EF' | 'ART' | 'ING';

export const MATERIAS: Record<Materia, { nome: string; cor: string }> = {
  LP: { nome: 'Língua Portuguesa', cor: 'bg-pink-100 text-pink-900 dark:bg-pink-900/40 dark:text-pink-100' },
  MAT: { nome: 'Matemática', cor: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100' },
  HIS: { nome: 'História', cor: 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100' },
  GEO: { nome: 'Geografia', cor: 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100' },
  CIE: { nome: 'Ciências', cor: 'bg-teal-100 text-teal-900 dark:bg-teal-900/40 dark:text-teal-100' },
  EF: { nome: 'Educação Física', cor: 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100' },
  ART: { nome: 'Arte', cor: 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100' },
  ING: { nome: 'Inglês', cor: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' },
};

export const TURMA_HORARIO = '6º ano D';

export const DIAS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'] as const;

export type Aula = { materia: Materia; professor: string };

export type Linha =
  | { tipo: 'aula'; numero: number; horario: string; dias: Aula[] }
  | { tipo: 'intervalo'; horario: string };

const A = (materia: Materia, professor: string): Aula => ({ materia, professor });

export const GRADE: Linha[] = [
  {
    tipo: 'aula',
    numero: 1,
    horario: '07:00–07:50',
    dias: [A('LP', 'Mariana'), A('MAT', 'Maria Celia'), A('LP', 'Mariana'), A('MAT', 'Maria Celia'), A('CIE', 'Mauricio')],
  },
  {
    tipo: 'aula',
    numero: 2,
    horario: '07:50–08:40',
    dias: [A('LP', 'Mariana'), A('MAT', 'Maria Celia'), A('HIS', 'Lucas'), A('MAT', 'Maria Celia'), A('CIE', 'Mauricio')],
  },
  { tipo: 'intervalo', horario: '08:40–09:00' },
  {
    tipo: 'aula',
    numero: 3,
    horario: '09:00–09:50',
    dias: [A('HIS', 'Lucas'), A('LP', 'Mariana'), A('EF', 'Fabiana'), A('ART', 'Débora'), A('ING', 'Sandra')],
  },
  {
    tipo: 'aula',
    numero: 4,
    horario: '09:50–10:40',
    dias: [A('MAT', 'Maria Celia'), A('ART', 'Débora'), A('ING', 'Sandra'), A('GEO', 'Milton'), A('GEO', 'Milton')],
  },
  {
    tipo: 'aula',
    numero: 5,
    horario: '10:40–11:30',
    dias: [A('GEO', 'Milton'), A('HIS', 'Lucas'), A('CIE', 'Mauricio'), A('EF', 'Fabiana'), A('LP', 'Mariana')],
  },
];
