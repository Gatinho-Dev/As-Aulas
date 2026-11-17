import { beforeEach, describe, expect, it, vi } from 'vitest';

const estado = vi.hoisted(() => ({
  notificacoes: [] as { id: string; kind: string }[],
  lidas: [] as string[],
  prefs: { notif_avisos: true, notif_atividades: true, notif_eventos: true } as Record<string, boolean>,
  erroLidas: null as string | null,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (tabela: string) => ({
      select: () => {
        if (tabela === 'notifications') return Promise.resolve({ data: estado.notificacoes, error: null });
        if (tabela === 'notification_reads') {
          return {
            eq: () =>
              Promise.resolve({
                data: estado.lidas.map((notification_id) => ({ notification_id })),
                error: estado.erroLidas ? { message: estado.erroLidas } : null,
              }),
          };
        }
        return {
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: estado.prefs, error: null }) }),
        };
      },
    }),
  },
}));

import { loadUnreadCount } from './Notificacoes';

const tresNaoLidasDeDoisTipos = [
  { id: 'n1', kind: 'nova_atividade' },
  { id: 'n2', kind: 'novo_aviso' },
  { id: 'n3', kind: 'evento_importante' },
  { id: 'n4', kind: 'prova_proxima' },
  { id: 'n5', kind: 'novo_aviso' },
];

describe('loadUnreadCount', () => {
  beforeEach(() => {
    estado.notificacoes = tresNaoLidasDeDoisTipos;
    estado.lidas = ['n1', 'n2'];
    estado.prefs = { notif_avisos: true, notif_atividades: true, notif_eventos: true };
    estado.erroLidas = null;
  });

  it('subtrai as notificações lidas do total', async () => {
    expect(await loadUnreadCount('usuario-1')).toBe(3);
  });

  it('retorna zero quando todas estão lidas', async () => {
    estado.lidas = tresNaoLidasDeDoisTipos.map((n) => n.id);
    expect(await loadUnreadCount('usuario-1')).toBe(0);
  });

  it('retorna zero em caso de erro, sem mostrar contador falso', async () => {
    estado.erroLidas = 'permission denied';
    expect(await loadUnreadCount('usuario-1')).toBe(0);
  });

  it('não conta tipos que o aluno desligou nas preferências', async () => {
    estado.prefs = { notif_avisos: false, notif_atividades: true, notif_eventos: true };
    // n2 e n5 são avisos (desligados) e n2 já está lida: sobram n3 e n4.
    expect(await loadUnreadCount('usuario-1')).toBe(2);
  });
});
