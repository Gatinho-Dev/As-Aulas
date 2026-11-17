import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Cloud,
  GraduationCap,
  Megaphone,
  MonitorSmartphone,
  Palette,
  Users,
} from 'lucide-react';
import { Logo } from './Layout';
import { BorderBeam } from 'border-beam';
import { Liquid } from 'liquid-gooey';
import { MetalText } from 'metal-fx';
import { ImageGeneration } from 'img-fx';

const LINKS = [
  { href: '#recursos', label: 'Recursos' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#perguntas', label: 'Perguntas' },
];

const HOJE = [
  {
    disciplina: 'Matemática',
    titulo: 'Lição de casa',
    ponto: 'bg-azul',
    status: 'Pendente',
    chip: 'bg-laranja/10 text-laranja',
  },
  {
    disciplina: 'História',
    titulo: 'Trabalho em grupo',
    ponto: 'bg-verde',
    status: 'Em andamento',
    chip: 'bg-azul-claro text-azul dark:bg-azul/15',
  },
  {
    disciplina: 'Ciências',
    titulo: 'Revisão para a prova',
    ponto: 'bg-vermelho',
    status: 'Concluída',
    chip: 'bg-verde/10 text-verde',
  },
];

const SEMANA = [
  { dia: 'Seg', valor: 70 },
  { dia: 'Ter', valor: 40 },
  { dia: 'Qua', valor: 100 },
  { dia: 'Qui', valor: 55 },
  { dia: 'Sex', valor: 25 },
  { dia: 'Sáb', valor: 0 },
  { dia: 'Dom', valor: 0 },
];

const PASSOS = [
  {
    titulo: 'Crie sua conta',
    texto: 'Escolha um nick, informe seu nome e selecione sua turma. Não pedimos CPF, endereço nem e-mail pessoal.',
  },
  {
    titulo: 'Entre com seu nick',
    texto: 'Nick e senha funcionam em qualquer aparelho. Ao voltar, suas atividades e o que você já concluiu continuam lá.',
  },
  {
    titulo: 'Acompanhe o dia',
    texto: 'Abra o painel e veja o que vence hoje, os próximos prazos, as provas e os avisos da sua turma.',
  },
];

const PERGUNTAS = [
  {
    pergunta: 'Preciso de e-mail para entrar?',
    resposta:
      'Não. A conta é criada com um nick, seu nome e a sua turma. O e-mail é apenas um identificador interno gerado pelo sistema.',
  },
  {
    pergunta: 'Quem consegue ver meu perfil?',
    resposta:
      'Somente alunos que estão na mesma turma ativa que você. Nome, bio, cor e fonte ficam visíveis para esses colegas; seu e-mail nunca aparece.',
  },
  {
    pergunta: 'O As Aulas envia notas ou faltas para a escola?',
    resposta:
      'Não. A plataforma organiza seus estudos: mostra prazos, atividades e avisos. Notas, faltas e entregas para professores não passam por aqui.',
  },
  {
    pergunta: 'Funciona no celular?',
    resposta:
      'Sim. No celular o menu lateral vira uma barra na parte de baixo e as páginas se adaptam à largura da tela.',
  },
  {
    pergunta: 'Preciso instalar algum aplicativo?',
    resposta:
      'Não. Basta abrir o As Aulas no navegador e entrar com seu nick. O tema claro ou escuro fica salvo no aparelho.',
  },
];

export default function Inicio() {
  return (
    <div className="min-h-dvh bg-white font-body text-tinta dark:bg-slate-950 dark:text-slate-100">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-marinho focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Ir para o conteúdo
      </a>

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
          <Logo />
          <nav aria-label="Seções da página" className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-tinta-suave transition-colors hover:bg-azul-claro hover:text-marinho dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/entrar"
              className="rounded-lg px-2.5 py-2 text-sm font-semibold text-marinho transition-colors hover:bg-azul-claro dark:text-slate-200 dark:hover:bg-slate-900 sm:px-3"
            >
              Entrar
            </Link>
            <Link
              to="/entrar?modo=criar"
              className="inline-flex items-center gap-1.5 rounded-lg bg-azul px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-800 sm:px-4"
            >
              Criar conta
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main id="conteudo">
        <section className="relative isolate overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="fundo-quadriculado pointer-events-none absolute inset-0" aria-hidden="true" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-40 size-[34rem] rounded-full bg-azul/10 blur-3xl dark:bg-azul/15"
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-10 md:px-8 md:pb-24 md:pt-20">
            <div className="entrada">
              <p className="inline-flex items-center gap-2 rounded-full border border-azul/20 bg-azul-claro px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-azul dark:border-azul/30 dark:bg-azul/10">
                <span className="size-1.5 rounded-full bg-verde" aria-hidden="true" />
                Escola Luiz Antoniazzi · Valinhos, SP
              </p>

              <h1 className="mt-5 font-display text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.03em] text-marinho dark:text-white sm:text-5xl lg:text-6xl">
                A escola inteira,
                <br />
                <span className="relative inline-block text-azul">
                  em um só lugar.
                  <svg
                    viewBox="0 0 320 14"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className="absolute -bottom-1 left-0 h-2.5 w-full text-azul/30 sm:-bottom-2 sm:h-3"
                  >
                    <path
                      d="M2 10C70 3 150 2 318 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-tinta-suave dark:text-slate-400 md:text-lg">
                Lições de casa, trabalhos, provas, avisos e datas importantes da sua turma. Abra o As Aulas e veja o que
                vence hoje, o que vem depois e o que a escola avisou.
              </p>

              <Liquid blur={6} contrast={18} fill="transparent" className="mt-8 flex flex-wrap items-center gap-3">
                <Liquid.Item>
                  <Link
                    to="/entrar?modo=criar"
                    className="inline-flex items-center gap-2 rounded-xl bg-azul px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-azul/20 transition-colors hover:bg-indigo-800"
                  >
                    Criar conta de aluno
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Liquid.Item>
                <Liquid.Item>
                  <Link
                    to="/entrar"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-marinho transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-900"
                  >
                    Já tenho conta
                  </Link>
                </Liquid.Item>
              </Liquid>

              <p className="mt-4 text-sm text-slate-500 dark:text-slate-500">
                Leva menos de um minuto. Você só precisa de um nick e da sua turma.
              </p>
            </div>

            <div className="entrada entrada-2">
              <BorderBeam className="rounded-2xl" colorVariant="ocean" theme="auto">
                <PreviaPainel />
              </BorderBeam>
            </div>
          </div>

          <ul className="relative mx-auto flex max-w-6xl flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm text-tinta-suave dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <li className="flex items-center gap-2">
              <MonitorSmartphone className="size-4 text-azul" aria-hidden="true" />
              Funciona no computador e no celular
            </li>
            <li className="flex items-center gap-2">
              <Cloud className="size-4 text-azul" aria-hidden="true" />
              Seu progresso fica salvo na nuvem
            </li>
            <li className="flex items-center gap-2">
              <GraduationCap className="size-4 text-azul" aria-hidden="true" />
              Feito para os alunos da escola
            </li>
          </ul>
        </section>

        <section id="recursos" aria-labelledby="titulo-recursos" className="bg-fundo py-20 dark:bg-slate-900/40 md:py-28">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <CabecalhoSecao
              id="titulo-recursos"
              eyebrow="O que você encontra"
              titulo="Cada parte responde a uma pergunta do dia"
              texto="O que tenho para fazer? Quando é a prova? O que a escola avisou? O painel foi montado em volta dessas três perguntas."
            />

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <BorderBeam className="rounded-2xl md:col-span-2" colorVariant="ocean" theme="auto">
                <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 md:p-8">
                <Icone>
                  <Clock className="size-5" aria-hidden="true" />
                </Icone>
                <h3 className="mt-4 font-display text-xl font-semibold text-marinho dark:text-white">
                  O dia já começa organizado
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-tinta-suave dark:text-slate-400">
                  O painel abre com as atividades que vencem hoje, com disciplina, turma e prazo. Marque o que terminou
                  e o progresso continua salvo quando você voltar.
                </p>
                <div className="mt-6 space-y-2 rounded-xl border border-slate-200 bg-fundo p-3 dark:border-slate-800 dark:bg-slate-950">
                  {[
                    { titulo: 'Lição de matemática', meta: 'Matemática · prazo hoje', chip: 'Hoje', cor: 'bg-laranja/10 text-laranja' },
                    { titulo: 'Resumo de história', meta: 'História · concluída', chip: 'Feito', cor: 'bg-verde/10 text-verde' },
                  ].map((item) => (
                    <div
                      key={item.titulo}
                      className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5 dark:bg-slate-900"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 dark:border-slate-600">
                        {item.chip === 'Feito' && <Check className="size-3 text-verde" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.titulo}</span>
                        <span className="block truncate text-xs text-tinta-suave dark:text-slate-400">{item.meta}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.cor}`}>
                        {item.chip}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
              </BorderBeam>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <Icone>
                  <CalendarDays className="size-5" aria-hidden="true" />
                </Icone>
                <h3 className="mt-4 font-display text-xl font-semibold text-marinho dark:text-white">Datas no lugar certo</h3>
                <p className="mt-2 text-sm leading-relaxed text-tinta-suave dark:text-slate-400">
                  Mês, semana ou lista: provas, trabalhos e eventos aparecem nas datas corretas, com filtro por turma e
                  disciplina.
                </p>
                <div className="mt-6 grid grid-cols-7 gap-1.5" aria-hidden="true">
                  {Array.from({ length: 21 }, (_, i) => (
                    <span
                      key={i}
                      className={`aspect-square rounded-[4px] ${
                        [3, 9, 16].includes(i) ? 'bg-azul' : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-tinta-suave dark:text-slate-400">Provas e entregas destacadas</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <Icone>
                  <Megaphone className="size-5" aria-hidden="true" />
                </Icone>
                <h3 className="mt-4 font-display text-xl font-semibold text-marinho dark:text-white">Avisos da sua turma</h3>
                <p className="mt-2 text-sm leading-relaxed text-tinta-suave dark:text-slate-400">
                  Comunicados com categoria e importância, entregues só para as turmas certas. Nada de recado perdido em
                  grupo de mensagens.
                </p>
                <div className="mt-6 rounded-lg border-l-4 border-azul bg-azul-claro/70 p-3 dark:bg-azul/10">
                  <p className="text-sm font-medium text-marinho dark:text-white">Novo aviso publicado</p>
                  <p className="mt-1 text-xs text-tinta-suave dark:text-slate-400">Categoria e importância aparecem na lista.</p>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <Icone>
                  <Users className="size-5" aria-hidden="true" />
                </Icone>
                <h3 className="mt-4 font-display text-xl font-semibold text-marinho dark:text-white">Turmas e disciplinas</h3>
                <p className="mt-2 text-sm leading-relaxed text-tinta-suave dark:text-slate-400">
                  Cada turma com suas disciplinas, professores e atividades. Filtre por ano e turno para achar rápido o
                  que importa.
                </p>
                <ul className="mt-6 space-y-2">
                  {[
                    { nome: 'Matemática', cor: 'bg-azul' },
                    { nome: 'História', cor: 'bg-verde' },
                    { nome: 'Ciências', cor: 'bg-vermelho' },
                  ].map((d) => (
                    <li key={d.nome} className="flex items-center gap-2 text-sm">
                      <span className={`size-2 rounded-full ${d.cor}`} aria-hidden="true" />
                      {d.nome}
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <Icone>
                  <Palette className="size-5" aria-hidden="true" />
                </Icone>
                <h3 className="mt-4 font-display text-xl font-semibold text-marinho dark:text-white">Perfil com a sua cara</h3>
                <p className="mt-2 text-sm leading-relaxed text-tinta-suave dark:text-slate-400">
                  Escolha uma cor, uma fonte e escreva uma bio. Colegas da mesma turma veem seu perfil — e só eles.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-azul font-display text-sm font-semibold text-white">
                    AA
                  </span>
                  <div className="flex gap-1.5" aria-hidden="true">
                    {['bg-azul', 'bg-verde', 'bg-laranja', 'bg-vermelho', 'bg-violet-500', 'bg-slate-600'].map((cor) => (
                      <span key={cor} className={`size-4 rounded-full ${cor}`} />
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="titulo-como-funciona" className="bg-white py-20 dark:bg-slate-950 md:py-28">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <CabecalhoSecao
              id="titulo-como-funciona"
              eyebrow="Como funciona"
              titulo="Da primeira entrada ao painel, em três passos"
              texto="Sem instalar nada e sem depender de e-mail. O caminho é o mesmo em qualquer aparelho."
            />

            <div className="relative mt-14">
              <div
                aria-hidden="true"
                className="absolute left-6 right-6 top-6 hidden border-t border-dashed border-slate-300 dark:border-slate-700 md:block"
              />
              <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
                {PASSOS.map((passo, indice) => (
                  <li key={passo.titulo} className="relative">
                    <span className="relative flex size-12 items-center justify-center rounded-full border border-slate-200 bg-white font-display text-lg font-semibold text-azul shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      {indice + 1}
                    </span>
                    <h3 className="mt-5 font-display text-xl font-semibold text-marinho dark:text-white">{passo.titulo}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-tinta-suave dark:text-slate-400">{passo.texto}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="relative isolate overflow-hidden bg-marinho py-20 text-white md:py-24">
          <div className="fundo-quadriculado fundo-quadriculado-escuro pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-[1.1fr_0.9fr] md:px-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-azul-claro/80">Sem surpresa na véspera</p>
              <h2 className="mt-4 max-w-xl font-display text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
                Nunca mais descubra o trabalho na noite anterior.
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-300">
                Com os prazos, as provas e os avisos no mesmo lugar, sobra tempo para estudar com calma em vez de
                correr atrás do recado.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/entrar?modo=criar"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-marinho transition-colors hover:bg-azul-claro"
                >
                  Criar minha conta
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/entrar"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Entrar com meu nick
                </Link>
              </div>
            </div>

            <div className="justify-self-center">
              <div className="rounded-[2rem] border border-white/15 bg-white/5 p-3 shadow-2xl backdrop-blur-sm">
                <ImageGeneration
                  preset="pixels-organic"
                  images="/logo.png"
                  autoReveal
                  theme="auto"
                  strength={0.75}
                  revealHoldMs={7000}
                  revealDelayRange={[9, 13]}
                  className="rounded-[1.5rem]"
                >
                  <img
                    src="/logo.png"
                    alt="Logo do As Aulas: prédio da escola com relógio e bandeira verde"
                    width={256}
                    height={256}
                    className="size-52 rounded-[1.5rem] object-cover sm:size-60"
                  />
                </ImageGeneration>
              </div>
              <div className="mt-4 flex justify-center">
                <MetalText font="600 18px/1.2 'Bricolage Grotesque', Inter, sans-serif" color="#ffffff" theme="dark">
                  As Aulas
                </MetalText>
              </div>
              <p className="text-center text-sm text-slate-400">Tudo da escola em um só lugar.</p>
            </div>
          </div>
        </section>

        <section id="perguntas" aria-labelledby="titulo-perguntas" className="bg-fundo py-20 dark:bg-slate-900/40 md:py-28">
          <div className="mx-auto max-w-3xl px-4 md:px-8">
            <CabecalhoSecao
              id="titulo-perguntas"
              eyebrow="Perguntas frequentes"
              titulo="O que costumam perguntar antes de entrar"
              centralizado
            />
            <div className="mt-10 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {PERGUNTAS.map((item) => (
                <details key={item.pergunta} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-tinta dark:text-slate-100 [&::-webkit-details-marker]:hidden">
                    {item.pergunta}
                    <ChevronDown
                      className="size-4 shrink-0 text-tinta-suave transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-2 pr-8 text-sm leading-relaxed text-tinta-suave dark:text-slate-400">{item.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16 dark:bg-slate-950 md:py-20">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 md:flex-row md:items-center md:justify-between md:px-8">
            <div>
              <h2 className="font-display text-2xl font-semibold text-marinho dark:text-white">
                Pronto para organizar a semana?
              </h2>
              <p className="mt-2 max-w-md text-sm text-tinta-suave dark:text-slate-400">
                Crie sua conta com um nick e comece a acompanhar as atividades da sua turma.
              </p>
            </div>
            <Link
              to="/entrar?modo=criar"
              className="inline-flex items-center gap-2 rounded-xl bg-azul px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-azul/20 transition-colors hover:bg-indigo-800"
            >
              Criar conta
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <Logo />
            <p className="mt-2 text-sm text-tinta-suave dark:text-slate-400">Tudo da escola em um só lugar.</p>
          </div>
          <nav aria-label="Acesso à conta" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link to="/entrar" className="font-medium text-tinta-suave hover:text-azul dark:text-slate-400">
              Entrar
            </Link>
            <Link to="/entrar?modo=criar" className="font-medium text-tinta-suave hover:text-azul dark:text-slate-400">
              Criar conta
            </Link>
            <a href="#recursos" className="font-medium text-tinta-suave hover:text-azul dark:text-slate-400">
              Recursos
            </a>
            <a href="#perguntas" className="font-medium text-tinta-suave hover:text-azul dark:text-slate-400">
              Perguntas
            </a>
          </nav>
          <p className="max-w-xs text-xs leading-relaxed text-slate-400">
            Feito para os alunos da Escola Luiz Antoniazzi, Valinhos · SP. Disponível por enquanto só para algumas salas.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PreviaPainel() {
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className="relative mx-auto max-w-md">
      <div
        aria-hidden="true"
        className="absolute -inset-3 rounded-[2rem] bg-azul/5 ring-1 ring-azul/10 dark:bg-azul/10"
      />
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-tinta-suave dark:text-slate-400">
              Para hoje
            </p>
            <p className="mt-0.5 truncate font-display text-lg font-semibold capitalize text-marinho dark:text-white">{hoje}</p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-azul-claro text-azul dark:bg-azul/15">
            <CalendarDays className="size-4" aria-hidden="true" />
          </span>
        </div>

        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {HOJE.map((item) => {
            const feita = item.status === 'Concluída';
            return (
              <li key={item.titulo} className="flex items-center gap-3 px-5 py-3.5">
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    feita ? 'border-verde bg-verde text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {feita && <Check className="size-3" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-tinta-suave dark:text-slate-400">
                    <span className={`size-1.5 rounded-full ${item.ponto}`} aria-hidden="true" />
                    {item.disciplina}
                  </span>
                  <span className="block truncate text-sm font-semibold text-tinta dark:text-slate-100">{item.titulo}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.chip}`}>
                  {item.status}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-tinta-suave dark:text-slate-400">
              Sua semana
            </p>
            <p className="text-[11px] text-slate-400">atividades por dia</p>
          </div>
          <div className="mt-3 flex items-end justify-between gap-2" aria-hidden="true">
            {SEMANA.map((dia) => (
              <div key={dia.dia} className="flex w-full flex-col items-center gap-1.5">
                <div className="flex h-12 w-full items-end rounded-md bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`w-full rounded-md ${dia.valor > 0 ? 'bg-azul' : 'bg-transparent'}`}
                    style={{ height: `${Math.max(dia.valor, 6)}%` }}
                  />
                </div>
                <span className="text-[10px] text-tinta-suave dark:text-slate-400">{dia.dia}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-400">Prévia do painel do aluno</p>
    </div>
  );
}

function CabecalhoSecao({
  id,
  eyebrow,
  titulo,
  texto,
  centralizado = false,
}: {
  id: string;
  eyebrow: string;
  titulo: string;
  texto?: string;
  centralizado?: boolean;
}) {
  return (
    <div className={centralizado ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-azul">{eyebrow}</p>
      <h2
        id={id}
        className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-marinho dark:text-white sm:text-4xl"
      >
        {titulo}
      </h2>
      {texto && <p className="mt-4 text-base leading-relaxed text-tinta-suave dark:text-slate-400">{texto}</p>}
    </div>
  );
}

function Icone({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex size-11 items-center justify-center rounded-xl bg-azul-claro text-azul dark:bg-azul/15">
      {children}
    </span>
  );
}
