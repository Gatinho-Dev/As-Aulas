import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { AtividadesAdmin, AvisosAdmin } from './Admin';

export default function Representante() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [turmas, setTurmas] = useState<{ id: string; name: string }[] | null>(null);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const { data, error } = await supabase
        .from('class_representatives')
        .select('class_id, classes(name)')
        .eq('user_id', userId);
      if (error) {
        setTurmas([]);
        return;
      }
      const lista = ((data ?? []) as unknown as { class_id: string; classes: { name: string } | null }[])
        .map((r) => ({ id: r.class_id, name: r.classes?.name ?? '' }))
        .filter((t) => t.name);
      setTurmas(lista);
    })();
  }, [userId]);

  if (!userId || turmas === null) {
    return (
      <div className="h-24 max-w-3xl animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" role="status" aria-label="Carregando área do representante" />
    );
  }

  const turmaIds = turmas.map((t) => t.id);

  if (turmas.length === 0) {
    return (
      <section aria-labelledby="titulo-representante" className="max-w-2xl space-y-3">
        <h1 id="titulo-representante" className="text-2xl font-bold">
          Área do representante
        </h1>
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm dark:border-slate-700">
          Você não é representante de nenhuma turma. Fale com a administração da escola.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-representante" className="max-w-4xl space-y-8">
      <div className="space-y-1">
        <h1 id="titulo-representante" className="text-2xl font-bold">
          Área do representante
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Você cuida das lições, trabalhos, provas e avisos de: {turmas.map((t) => t.name).join(', ')}.
        </p>
      </div>
      <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
        <p className="font-semibold">Aviso para o representante</p>
        <p className="mt-1">
          Você pode publicar lições, trabalhos, provas e avisos somente para a(s) sua(s) turma(s). Não é possível
          criar avisos para a escola toda, nem alterar turmas, disciplinas ou outros representantes: isso é feito pela
          administração. Confira sempre o prazo e o título antes de publicar, porque os alunos recebem notificação.
        </p>
      </div>

      <GuiaRepresentante />

      <AtividadesAdmin autorId={userId} turmaIds={turmaIds} />
      <AvisosAdmin autorId={userId} turmaIds={turmaIds} />
    </section>
  );
}

function GuiaRepresentante() {
  return (
    <section aria-labelledby="guia-representante" className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 md:p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 id="guia-representante" className="text-lg font-semibold">
        Como usar o As Aulas
      </h2>

      <div className="space-y-2">
        <h3 className="font-semibold">O menu</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
          <li><strong>Visão geral:</strong> início, com o que está pendente e os próximos prazos.</li>
          <li><strong>Lições de casa, Trabalhos e Provas:</strong> as atividades da turma, com filtros e detalhes de cada uma.</li>
          <li><strong>Calendário:</strong> entregas, provas e eventos por dia e por mês.</li>
          <li><strong>Avisos:</strong> recados da escola e da turma.</li>
          <li><strong>Turmas e Disciplinas:</strong> consulta das turmas e das matérias.</li>
          <li><strong>Busca, sino de notificações e Meu perfil:</strong> encontrar algo, ver avisos recebidos e alterar seu nome.</li>
        </ul>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Em celulares, o menu fica na barra de baixo; em Mais estão os itens restantes.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Publicar uma atividade</h3>
        <ol className="list-inside list-decimal space-y-1 text-sm text-slate-700 dark:text-slate-300">
          <li>Na seção <strong>Atividades</strong>, use o formulário <strong>Nova atividade</strong>.</li>
          <li>Em <strong>Tipo</strong>, escolha Lição de casa, Trabalho ou Prova.</li>
          <li>Preencha o <strong>Título</strong>, a <strong>Turma</strong> e a <strong>Disciplina</strong>. Só aparecem as suas turmas.</li>
          <li>Informe o <strong>Prazo</strong>. Atividade publicada precisa ter prazo futuro.</li>
          <li>Se quiser, preencha a <strong>Descrição</strong>.</li>
          <li>Deixe <strong>Publicar agora para a turma</strong> marcado para os alunos verem na hora. Desmarque para salvar como rascunho.</li>
          <li>Clique em <strong>Salvar atividade</strong>.</li>
        </ol>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Publicar, arquivar ou corrigir uma atividade</h3>
        <ol className="list-inside list-decimal space-y-1 text-sm text-slate-700 dark:text-slate-300">
          <li>Na lista da seção <strong>Atividades</strong>, use <strong>Publicar</strong> para tornar visível um rascunho.</li>
          <li>Use <strong>Arquivar</strong> para tirar uma atividade da lista dos alunos, sem apagá-la.</li>
          <li>Para mudar título, prazo ou descrição de uma atividade já publicada, peça à administração, porque a edição completa ainda não está disponível aqui.</li>
        </ol>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Publicar um aviso</h3>
        <ol className="list-inside list-decimal space-y-1 text-sm text-slate-700 dark:text-slate-300">
          <li>Na seção <strong>Avisos</strong>, preencha o <strong>Título</strong> e a <strong>Mensagem</strong>.</li>
          <li>Se quiser, escolha a <strong>Categoria</strong> e a <strong>Importância</strong> (Normal, Importante ou Urgente).</li>
          <li>Em <strong>Destinatários</strong>, marque sua turma. Só aparecem as suas turmas.</li>
          <li>Clique em <strong>Publicar aviso</strong>. Os alunos da turma recebem a notificação.</li>
        </ol>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Dicas</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
          <li>Use títulos curtos e claros, como “Lista de exercícios 3 – Frações”.</li>
          <li>Quando mudar um prazo, publique um aviso explicando a mudança.</li>
          <li>Se algo não aparecer ou der erro, avise a administração da escola.</li>
        </ul>
      </div>
    </section>
  );
}
