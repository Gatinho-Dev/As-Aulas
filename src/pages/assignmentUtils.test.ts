import { describe, expect, it, vi } from 'vitest';
import { addDays, dayKey, diffDays, statusOf } from './assignmentUtils';

vi.mock('../lib/supabase', () => ({ supabase: {} }));

describe('dayKey', () => {
  it('usa o dia de São Paulo, não o de UTC', () => {
    // 02:30 UTC do dia 21 ainda é dia 20 em São Paulo (UTC-3).
    expect(dayKey('2026-10-21T02:30:00Z')).toBe('2026-10-20');
    expect(dayKey('2026-10-21T15:00:00Z')).toBe('2026-10-21');
  });
});

describe('addDays e diffDays', () => {
  it('atravessa o fim do mês sem leap year', () => {
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
  });

  it('calcula a diferença em dias inteiros', () => {
    expect(diffDays('2026-10-01', '2026-10-21')).toBe(20);
    expect(diffDays('2026-10-21', '2026-10-01')).toBe(-20);
  });
});

describe('statusOf', () => {
  const futuro = new Date(Date.now() + 86_400_000).toISOString();
  const passado = new Date(Date.now() - 86_400_000).toISOString();

  it('marca como atrasada uma atividade vencida sem conclusão', () => {
    expect(statusOf(passado, undefined)).toBe('atrasada');
  });

  it('mantém pendente uma atividade no prazo', () => {
    expect(statusOf(futuro, undefined)).toBe('pendente');
  });

  it('respeita a conclusão pessoal mesmo depois do prazo', () => {
    expect(statusOf(passado, 'concluida')).toBe('concluida');
  });
});
