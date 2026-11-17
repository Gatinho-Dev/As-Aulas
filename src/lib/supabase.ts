import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.local.');
}

// PKCE: o retorno do login Google chega com ?code=, trocado automaticamente pela sessão.
export const supabase = createClient(url, key, {
  auth: { flowType: 'pkce' },
});
