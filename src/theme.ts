export const TEMA_KEY = 'as-aulas-tema';

/** Aplica o tema salvo (ou o do sistema) antes da primeira renderização. */
export function aplicarTemaSalvo(): void {
  const salvo = localStorage.getItem(TEMA_KEY);
  const escuro =
    salvo === 'escuro' || (salvo !== 'claro' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', escuro);
}
