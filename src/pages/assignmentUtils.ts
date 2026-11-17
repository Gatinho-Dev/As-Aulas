import { supabase } from '../lib/supabase';
import type { AutorResumo } from '../lib/pessoa';

export const TZ = 'America/Sao_Paulo';

export type AssignmentType = 'licao_casa' | 'trabalho' | 'prova';

export const TYPE_LABEL: Record<AssignmentType, string> = {
  licao_casa: 'Lição de casa',
  trabalho: 'Trabalho',
  prova: 'Prova',
};

export type AssignmentRow = {
  id: string;
  type: AssignmentType;
  title: string;
  due_at: string;
  priority?: 'baixa' | 'media' | 'alta';
  class_id?: string;
  subject_id?: string;
  classes?: { name: string } | null;
  subjects?: { name: string; color: string } | null;
  autor?: AutorResumo | null;
  professor?: string | null;
};

export type ProgressStatus = 'pendente' | 'em_andamento' | 'concluida';

export type Progress = {
  assignment_id: string;
  personal_status: ProgressStatus;
  completed_at: string | null;
};

export type ItemStatus = 'pendente' | 'concluida' | 'atrasada';

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Chave YYYY-MM-DD do dia no fuso de São Paulo. */
export function dayKey(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Soma dias a uma chave YYYY-MM-DD. */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Dias inteiros entre duas chaves YYYY-MM-DD (b - a). */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function statusOf(dueIso: string, personal: ProgressStatus | undefined): ItemStatus {
  if (personal === 'concluida') return 'concluida';
  return new Date(dueIso).getTime() < Date.now() ? 'atrasada' : 'pendente';
}

/** Grava o progresso pessoal do aluno (um registro por aluno e atividade). */
export async function saveProgress(
  assignmentId: string,
  userId: string,
  personal: ProgressStatus,
): Promise<string | null> {
  const { error } = await supabase.from('assignment_progress').upsert(
    {
      assignment_id: assignmentId,
      user_id: userId,
      personal_status: personal,
      completed_at: personal === 'concluida' ? new Date().toISOString() : null,
    },
    { onConflict: 'assignment_id,user_id' },
  );
  return error ? error.message : null;
}

/** Mapa "turma:disciplina" -> nome do professor responsável. */
export async function carregarProfessores(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('class_subjects')
    .select('class_id, subject_id, teacher_name');
  if (error) return {};
  const mapa: Record<string, string> = {};
  for (const linha of (data ?? []) as { class_id: string; subject_id: string; teacher_name: string | null }[]) {
    if (linha.teacher_name) mapa[`${linha.class_id}:${linha.subject_id}`] = linha.teacher_name;
  }
  return mapa;
}

export function professorDe(
  mapa: Record<string, string>,
  classId: string | null | undefined,
  subjectId: string | null | undefined,
): string | null {
  if (!classId || !subjectId) return null;
  return mapa[`${classId}:${subjectId}`] ?? null;
}

export async function loadAssignments(type: AssignmentType): Promise<AssignmentRow[]> {
  const [res, professores] = await Promise.all([
    supabase
      .from('assignments')
      .select(
        'id, type, title, due_at, priority, class_id, subject_id, classes(name), subjects(name, color), autor:profiles!assignments_created_by_fkey(display_name, avatar_path, accent_color)',
      )
      .eq('type', type)
      .eq('status', 'publicada')
      .order('due_at', { ascending: true }),
    carregarProfessores(),
  ]);
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as unknown as AssignmentRow[]).map((linha) => ({
    ...linha,
    professor: professorDe(professores, linha.class_id, linha.subject_id),
  }));
}

export async function loadProgressMap(): Promise<Record<string, Progress>> {
  const { data, error } = await supabase
    .from('assignment_progress')
    .select('assignment_id, personal_status, completed_at');
  if (error) throw new Error(error.message);
  const map: Record<string, Progress> = {};
  for (const row of (data ?? []) as Progress[]) map[row.assignment_id] = row;
  return map;
}
