-- Rodar uma vez no SQL Editor do Supabase.
-- Adiciona assunto/status as mensagens de contato (sem quebrar as existentes)
-- e um rate limit simples direto no banco (mesmo e-mail nao pode enviar
-- duas mensagens em menos de 60 segundos).

alter table public.messages
  add column if not exists subject text not null default 'outro_assunto',
  add column if not exists status  text not null default 'nova';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'messages_subject_check') then
    alter table public.messages
      add constraint messages_subject_check
      check (subject in ('novo_projeto','orcamento','parceria','suporte','outro_assunto'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'messages_status_check') then
    alter table public.messages
      add constraint messages_status_check
      check (status in ('nova','em_atendimento','respondida','arquivada'));
  end if;
end $$;

create index if not exists messages_status_idx on public.messages (status);

-- Trigger de rate limit: roda com privilegio do dono da function (contorna
-- a RLS so pra essa checagem interna) mesmo sendo disparada por um insert
-- anonimo do formulario publico.
create or replace function public.check_message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.messages
    where email = new.email
      and created_at > now() - interval '60 seconds'
  ) then
    raise exception 'Aguarde um momento antes de enviar outra mensagem.';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.check_message_rate_limit();
