import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PreviaPerfil from '../components/PreviaPerfil';
import { urlPublicaAvatar } from '../lib/avatar';
import { corValida, fonteValida } from '../lib/perfilEstilo';

type PerfilPublico = {
  display_name: string;
  username: string | null;
  role: 'admin' | 'student';
  bio: string | null;
  accent_color: string;
  font_style: string;
  avatar_path: string | null;
  perfil_oculto: boolean;
};

export default function PerfilColega() {
  const { id = '' } = useParams();
  const [perfil, setPerfil] = useState<PerfilPublico | null | undefined>(undefined);

  useEffect(() => {
    setPerfil(undefined);
    void (async () => {
      // A função do servidor aplica a privacidade: foto e bio somem quando o aluno ocultou o perfil.
      const { data, error } = await supabase.rpc('perfil_colega', { p_user: id });
      if (error) {
        setPerfil(null);
        return;
      }
      const linha = (Array.isArray(data) ? data[0] : null) as PerfilPublico | null | undefined;
      setPerfil(linha ?? null);
    })();
  }, [id]);

  if (perfil === undefined) {
    return (
      <div className="h-48 max-w-md animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" role="status" aria-label="Carregando perfil" />
    );
  }

  if (perfil === null) {
    return (
      <div className="space-y-3">
        <p className="font-medium">Perfil não encontrado ou fora das suas turmas.</p>
        <Link to="/turmas" className="text-sm font-medium text-indigo-800 hover:underline dark:text-indigo-300">
          Voltar para Turmas
        </Link>
      </div>
    );
  }

  return (
    <section aria-label={`Perfil de ${perfil.display_name}`} className="space-y-6">
      <Link to="/turmas" className="text-sm font-medium text-indigo-800 hover:underline dark:text-indigo-300">
        ← Turmas
      </Link>
      <PreviaPerfil
        nivel={1}
        nome={perfil.display_name}
        nick={perfil.username}
        fotoUrl={urlPublicaAvatar(perfil.avatar_path)}
        bio={perfil.bio ?? ''}
        cor={corValida(perfil.accent_color)}
        fonte={fonteValida(perfil.font_style)}
        papel={perfil.role === 'admin' ? 'Administrador' : 'Aluno'}
        placeholderBio={perfil.perfil_oculto ? 'Este aluno optou por ocultar a bio.' : 'Este colega ainda não escreveu uma bio.'}
      />
      {perfil.perfil_oculto && (
        <p className="text-sm text-slate-500">Este aluno optou por ocultar foto e bio dos colegas.</p>
      )}
    </section>
  );
}
