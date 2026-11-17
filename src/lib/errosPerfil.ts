/** Traduz os erros das funções de perfil (nick, nome e onboarding) para o aluno. */

function dataLiberacao(detalhe: string | null | undefined): string | null {
  if (!detalhe) return null;
  const data = new Date(detalhe);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function mensagemErroPerfil(codigo: string, detalhe?: string | null): string {
  const c = codigo.trim();
  if (c === 'PRAZO_NOME') {
    const quando = dataLiberacao(detalhe);
    return quando
      ? `Você poderá alterar seu nome de exibição a partir de ${quando}.`
      : 'Você alterou seu nome de exibição recentemente. Tente novamente mais tarde.';
  }
  if (c === 'PRAZO_NICK') {
    const quando = dataLiberacao(detalhe);
    return quando
      ? `Você poderá alterar seu nick a partir de ${quando}.`
      : 'Você alterou seu nick recentemente. Tente novamente mais tarde.';
  }
  if (c === 'NICK_INVALIDO') return 'Nick inválido: use de 3 a 20 letras, números, _ ou ponto.';
  if (c === 'NICK_RESERVADO') return 'Este nick não está disponível. Escolha outro.';
  if (c === 'NICK_EM_USO') return 'Este nick já está em uso. Escolha outro.';
  if (c === 'NOME_INVALIDO') return 'Informe um nome com de 2 a 40 caracteres.';
  if (c === 'PERFIL_INCOMPLETO') return 'Conclua a configuração do seu perfil antes de alterar isso.';
  return 'Não foi possível salvar. Tente novamente.';
}
