-- Rodar uma vez no SQL Editor do Supabase.
-- Campo opcional de WhatsApp nas mensagens de contato.

alter table public.messages
  add column if not exists whatsapp text;
