import { urlPublicaAvatar } from '../lib/avatar';
import { CORES_PERFIL, corValida } from '../lib/perfilEstilo';
import { iniciaisDe } from './PreviaPerfil';

type Props = {
  nome: string;
  caminho?: string | null;
  cor?: string | null;
  /** Substitui o tamanho padrão (size-10), por exemplo "size-12". */
  className?: string;
};

/** Avatar pequeno de outro aluno: foto quando existe, senão as iniciais na cor do perfil. */
export default function AvatarAluno({ nome, caminho, cor, className }: Props) {
  const foto = urlPublicaAvatar(caminho);
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold ${
        CORES_PERFIL[corValida(cor)].avatar
      } ${className ?? 'size-10'}`}
      aria-hidden="true"
    >
      {foto ? <img src={foto} alt="" className="size-full object-cover" /> : iniciaisDe(nome) || '?'}
    </span>
  );
}
