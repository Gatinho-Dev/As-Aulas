import { supabase } from './supabase';

export const BUCKET_AVATARES = 'avatars';
export const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024;
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** URL pública do arquivo. Como o caminho inclui um carimbo de tempo, trocar a
 *  foto gera uma URL nova e o navegador não mostra a imagem antiga em cache. */
export function urlPublicaAvatar(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  const { data } = supabase.storage.from(BUCKET_AVATARES).getPublicUrl(caminho);
  return data.publicUrl;
}

export function validarFoto(arquivo: File): string | null {
  if (!TIPOS_FOTO.includes(arquivo.type)) return 'Escolha uma imagem JPG, PNG, WebP ou GIF.';
  if (arquivo.size > TAMANHO_MAXIMO_FOTO) return 'A imagem precisa ter no máximo 2 MB.';
  return null;
}

export function caminhoNovoAvatar(userId: string, extensao: string): string {
  return `${userId}/${Date.now()}.${extensao}`;
}

/** Extensão a partir do tipo do blob gerado pelo enquadrador. */
export function extensaoDoTipo(tipo: string): string {
  const porTipo: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return porTipo[tipo] ?? 'webp';
}
