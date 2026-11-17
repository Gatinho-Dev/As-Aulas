-- Tutor IA: guarda a interface dinâmica validada junto da mensagem do assistente.
-- Fica null quando a resposta é apenas texto.

alter table public.tutor_messages
  add column if not exists ui jsonb;

comment on column public.tutor_messages.ui is
  'Interface dinâmica validada devolvida pela IA; null quando a resposta é só texto.';
