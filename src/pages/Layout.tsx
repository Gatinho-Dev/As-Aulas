import { useEffect, useState, type ComponentType, type FormEvent } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, CalendarDays, CircleHelp, Clock, ClipboardCheck, GraduationCap, Trophy, TrendingUp, FolderKanban, LayoutDashboard, Library, LogOut, Megaphone, Moon, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Search, Settings, SlidersHorizontal, Sun, Users } from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';
import { useAuth } from '../auth/AuthContext';
import Tutorial from '../tutorial/Tutorial';
import { chaveSessaoTutorial } from '../tutorial/passos';
import { urlPublicaAvatar } from '../lib/avatar';
import { supabase } from '../lib/supabase';
import { TEMA_KEY } from '../theme';
import { loadUnreadCount } from './Notificacoes';
import Inicio from './Inicio';
import { precisaOnboarding } from './Onboarding';

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  grupo: string;
};

// Ordem dos grupos na barra lateral e no menu "Mais".
const GRUPOS = ['Acompanhar', 'Estudar', 'Escola', 'Conta'] as const;

const NAV: NavItem[] = [
  { to: '/', label: 'Vis\u00e3o geral', icon: LayoutDashboard, grupo: 'Acompanhar' },
  { to: '/licoes', label: 'Li\u00e7\u00f5es de casa', icon: BookOpen, grupo: 'Acompanhar' },
  { to: '/trabalhos', label: 'Trabalhos', icon: FolderKanban, grupo: 'Acompanhar' },
  { to: '/provas', label: 'Provas', icon: ClipboardCheck, grupo: 'Acompanhar' },
  { to: '/calendario', label: 'Calend\u00e1rio', icon: CalendarDays, grupo: 'Acompanhar' },
  { to: '/avisos', label: 'Avisos', icon: Megaphone, grupo: 'Acompanhar' },
  { to: '/horario', label: 'Meu Hor\u00e1rio', icon: Clock, grupo: 'Estudar' },
  { to: '/desempenho', label: 'Meu Desempenho', icon: TrendingUp, grupo: 'Estudar' },
  { to: '/conquistas', label: 'Conquistas e Metas', icon: Trophy, grupo: 'Estudar' },
  { to: '/tutor', label: 'Tutor IA', icon: GraduationCap, grupo: 'Estudar' },
  { to: '/turmas', label: 'Turmas', icon: Users, grupo: 'Escola' },
  { to: '/disciplinas', label: 'Disciplinas', icon: Library, grupo: 'Escola' },
  { to: '/configuracoes', label: 'Configura\u00e7\u00f5es', icon: SlidersHorizontal, grupo: 'Conta' },
];

const ITEM_ADMIN: NavItem = { to: '/admin', label: 'Administração', icon: Settings, grupo: 'Conta' };

// Atalhos fixos na barra inferior do celular; o restante fica no menu "Mais"
// 4 atalhos + botão Mais = 5 colunas, cabe bem no polegar e não quebra o grid.
const NAV_MOBILE: (Omit<NavItem, 'grupo'> & { short: string })[] = [
  { to: '/', label: 'Visão geral', short: 'Início', icon: LayoutDashboard },
  { to: '/licoes', label: 'Lições de casa', short: 'Lições', icon: BookOpen },
  { to: '/avisos', label: 'Avisos', short: 'Avisos', icon: Megaphone },
  { to: '/calendario', label: 'Calendário', short: 'Agenda', icon: CalendarDays },
];

// Identifica, na navegação, os destinos citados pelo tutorial.
const TUTORIAL_NAV: Record<string, string> = {
  '/': 'inicio',
  '/licoes': 'atividades',
  '/calendario': 'datas',
  '/horario': 'horario',
  '/desempenho': 'desempenho',
  '/conquistas': 'conquistas',
};

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold text-indigo-900 dark:text-white">
      <img
        src="/logo.png"
        alt=""
        aria-hidden="true"
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-lg object-cover"
      />
      <span className="text-lg">As Aulas</span>
    </Link>
  );
}

function ThemeToggle() {
  const [escuro, setEscuro] = useState(() => document.documentElement.classList.contains('dark'));

  function alternar() {
    const proximo = !escuro;
    document.documentElement.classList.toggle('dark', proximo);
    localStorage.setItem(TEMA_KEY, proximo ? 'escuro' : 'claro');
    setEscuro(proximo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
      className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {escuro ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}

export default function Layout() {
  const { session, profile, loading, signOut, concluirTutorial } = useAuth();
  const location = useLocation();
  const [naoLidas, setNaoLidas] = useState(0);
  const [maisAberto, setMaisAberto] = useState(false);
  const [tutorialAberto, setTutorialAberto] = useState(false);
  const [barraVisivel, setBarraVisivel] = useState(true);
  // Professor com solicitação pendente: fica só no painel aguardando aprovação.
  const [aguardandoProf, setAguardandoProf] = useState(false);
  const userId = session?.user.id;
  // Conta de demonstração: o tutorial abre em todo acesso, mesmo já concluído no perfil.
  const tutorialSempreVisivel = profile?.tutorial_sempre_visivel === true;

  // Abre automaticamente no primeiro acesso, enquanto o aluno não concluiu nem dispensou o tutorial nesta sessão.
  useEffect(() => {
    if (!userId || !profile) return;
    if (!tutorialSempreVisivel && profile.tutorial_concluido_em) return;
    if (sessionStorage.getItem(chaveSessaoTutorial(userId))) return;
    setTutorialAberto(true);
  }, [userId, profile, tutorialSempreVisivel]);

  useEffect(() => {
    if (!userId) return;
    void loadUnreadCount(userId).then(setNaoLidas);
  }, [userId, location.pathname]);

  useEffect(() => {
    if (!userId || profile?.role !== 'student') {
      setAguardandoProf(false);
      return;
    }
    // Alunos de nick entram pelo e-mail interno; quem tem e-mail real pode ser professor aguardando.
    if ((session?.user.email ?? '').endsWith('@alunos.as-aulas.local')) {
      setAguardandoProf(false);
      return;
    }
    let ativo = true;
    supabase.from('teacher_requests').select('status').eq('user_id', userId).maybeSingle().then(({ data }) => {
      if (ativo) setAguardandoProf(data?.status === 'pendente');
    });
    return () => {
      ativo = false;
    };
  }, [userId, profile, session]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-3 text-slate-500" role="status">
        <ThinkingOrb state="connecting" size={32} />
        Carregando…
      </div>
    );
  }
  if (!session) {
    if (location.pathname === '/') return <Inicio />;
    if (location.pathname === '/professores') return <Outlet />;
    return <Navigate to="/entrar" replace />;
  }
  // Professores têm painel próprio e não passam pelo onboarding de aluno.
  if (profile?.role === 'teacher') {
    if (location.pathname === '/professor') return <Outlet />;
    if (location.pathname === '/perfil' || location.pathname === '/configuracoes') return <Outlet />;
    return <Navigate to="/professor" replace />;
  }
  // Professor aguardando aprovação não usa o painel do aluno: vai para a tela de espera.
  if (aguardandoProf && location.pathname === '/professor') return <Outlet />;
  if (aguardandoProf) return <Navigate to="/professor" replace />;
  // Contas sem perfil concluído só acessam o onboarding até escolher nick e nome.
  if (precisaOnboarding(profile) && location.pathname !== '/bem-vindo') return <Navigate to="/bem-vindo" replace />;

  const navItems = profile?.role === 'admin' ? [...NAV, ITEM_ADMIN] : NAV;
  const fotoPerfil = urlPublicaAvatar(profile?.avatar_path);
  const nome = profile?.display_name ?? session.user.email ?? 'Usuário';
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="min-h-dvh md:flex">
      <aside className={`sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${barraVisivel ? 'md:flex' : 'md:hidden'}`}>
        <Logo />
        <nav aria-label="Principal" className="flex flex-col gap-5">
          {GRUPOS.map((grupo) => {
            const itens = navItems.filter((item) => item.grupo === grupo);
            if (itens.length === 0) return null;
            return (
              <div key={grupo} className="flex flex-col gap-1">
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{grupo}</p>
                {itens.map((item) => (
                  <NavItemLink key={item.to} item={item} />
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 md:px-8">
            <div className="md:hidden">
              <Logo />
            </div>
            <button
              type="button"
              onClick={() => setBarraVisivel((v) => !v)}
              aria-label={barraVisivel ? 'Esconder barra lateral' : 'Mostrar barra lateral'}
              aria-expanded={barraVisivel}
              title={barraVisivel ? 'Esconder barra lateral' : 'Mostrar barra lateral'}
              className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:block dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {barraVisivel ? <PanelLeftClose className="size-5" aria-hidden /> : <PanelLeftOpen className="size-5" aria-hidden />}
            </button>
            <BuscaForm />
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Link
                to="/notificacoes"
                data-tutorial="notificacoes"
                aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} não lida(s)` : 'Notificações'}
                className="relative flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Bell className="size-5" aria-hidden />
                {naoLidas > 0 && (
                  <span
                    className="absolute -right-0.5 -top-0.5 flex min-w-[1.1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white"
                    aria-hidden="true"
                  >
                    {naoLidas > 99 ? '99+' : naoLidas}
                  </span>
                )}
              </Link>
              <button
                type="button"
                data-tutorial="ajuda"
                onClick={() => setTutorialAberto(true)}
                aria-label="Ver tutorial novamente"
                title="Ver tutorial novamente"
                className="hidden min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 sm:flex dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <CircleHelp className="size-5" aria-hidden />
              </button>
              <ThemeToggle />
              <Link
                to="/perfil"
                className="flex items-center gap-2 rounded-lg hover:opacity-90"
              >
                <span
                  className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-sm font-semibold text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200"
                  aria-hidden="true"
                >
                  {fotoPerfil ? (
                    <img src={fotoPerfil} alt="" className="size-full object-cover" />
                  ) : (
                    iniciais || '?'
                  )}
                </span>
                <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:block">{nome}</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  // Na conta de demonstração, a próxima entrada no mesmo navegador reabre o tutorial.
                  if (tutorialSempreVisivel && userId) sessionStorage.removeItem(chaveSessaoTutorial(userId));
                  void signOut();
                }}
                aria-label="Sair"
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 p-2 text-sm font-medium hover:bg-slate-100 sm:px-3 sm:py-1.5 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <LogOut className="size-4" aria-hidden />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-32 sm:px-6 md:px-8 md:py-8 md:pb-10" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
          <Outlet />
        </main>

        {tutorialAberto && userId && (
          <Tutorial
            key={userId}
            onEncerrar={async (concluido) => {
              // Só a conclusão grava no perfil; sair antes não altera um tutorial já concluído.
              if (concluido) {
                const falha = await concluirTutorial(true);
                if (falha) return falha;
              }
              // Marca a sessão também ao concluir, para a conta de demonstração não reabrir
              // o tutorial logo após gravar a conclusão no perfil.
              sessionStorage.setItem(chaveSessaoTutorial(userId), '1');
              setTutorialAberto(false);
              return null;
            }}
          />
        )}

        {maisAberto && (
          <div className="fixed inset-0 z-30 bg-slate-950/40 md:hidden" onClick={() => setMaisAberto(false)} aria-hidden="true" />
        )}
        <div
          id="menu-mais"
          role="dialog"
          aria-label="Todas as seções"
          className={`fixed inset-x-3 z-40 origin-bottom rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl transition md:hidden dark:border-slate-800 dark:bg-slate-900 ${maisAberto ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'}`}
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))', maxHeight: 'min(70dvh, 32rem)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
        >
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Menu</p>
          {GRUPOS.map((grupo) => {
            const itens = navItems.filter((item) => item.grupo === grupo);
            if (itens.length === 0) return null;
            return (
              <div key={grupo} className="mt-1">
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{grupo}</p>
                <ul className="grid grid-cols-1 gap-1 min-[380px]:grid-cols-2">
                  {itens.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        data-tutorial={TUTORIAL_NAV[item.to]}
                        end={item.to === '/'}
                        onClick={() => setMaisAberto(false)}
                        className={({ isActive }) =>
                          `flex min-h-12 items-center gap-2.5 rounded-xl px-3 py-3 text-[15px] font-medium ${isActive ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`
                        }
                      >
                        <item.icon className="size-6 shrink-0" aria-hidden />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <nav
          aria-label="Principal (celular)"
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {NAV_MOBILE.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-tutorial={TUTORIAL_NAV[item.to]}
              end={item.to === '/'}
              onClick={() => setMaisAberto(false)}
              className={({ isActive }) =>
                `flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs font-medium ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`flex items-center justify-center rounded-full px-4 py-1 ${isActive ? 'bg-indigo-100 dark:bg-indigo-950' : ''}`}>
                    <item.icon className="size-6" aria-hidden />
                  </span>
                  <span className="max-w-full truncate leading-tight">{item.short}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            data-tutorial="mais"
            onClick={() => setMaisAberto((v) => !v)}
            aria-expanded={maisAberto}
            aria-controls="menu-mais"
            className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs font-medium ${maisAberto ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
          >
            <span className={`flex items-center justify-center rounded-full px-4 py-1 ${maisAberto ? 'bg-indigo-100 dark:bg-indigo-950' : ''}`}>
              <MoreHorizontal className="size-6" aria-hidden />
            </span>
            <span className="leading-tight">Mais</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

function BuscaForm() {
  const navigate = useNavigate();
  const [termo, setTermo] = useState('');

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = termo.trim();
    if (q.length < 2) return;
    navigate(`/busca?q=${encodeURIComponent(q)}`);
    setTermo('');
  }

  return (
    <form role="search" onSubmit={enviar} className="relative order-last w-full min-w-0 md:order-none md:w-auto md:max-w-xs md:flex-1">
      <label htmlFor="busca-global" className="sr-only">
        Buscar atividades, avisos, turmas e disciplinas
      </label>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
      <input
        id="busca-global"
        type="search"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Buscar lições, avisos, turmas…"
        enterKeyHint="search"
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </form>
  );
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      data-tutorial={TUTORIAL_NAV[item.to]}
      end={item.to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`
      }
    >
      <item.icon className="size-5" aria-hidden />
      {item.label}
    </NavLink>
  );
}
