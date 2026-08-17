-- Rodar uma vez no SQL Editor do Supabase (projeto Kleber-site).
-- Adiciona: mensagens de contato do site + configuracoes editaveis (links).

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "public insert messages" on public.messages;
create policy "public insert messages"
  on public.messages for insert
  to anon, authenticated
  with check (true);

-- Sem policy de select para "anon": so o admin logado consegue ler as
-- mensagens. Qualquer visitante consegue enviar, ninguem alem de voce le.
drop policy if exists "authenticated manage messages" on public.messages;
create policy "authenticated manage messages"
  on public.messages for all
  to authenticated
  using (true)
  with check (true);

alter publication supabase_realtime add table public.messages;

create table if not exists public.site_settings (
  id            int primary key default 1,
  whatsapp_url  text,
  instagram_url text,
  linkedin_url  text,
  contact_email text,
  updated_at    timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

insert into public.site_settings (id, whatsapp_url, instagram_url, linkedin_url, contact_email)
values (1, 'https://wa.me/5511973367068', 'https://www.instagram.com/omktdokleber/', 'https://www.linkedin.com/in/kleber-s-lago/', 'klebersimaslago@gmail.com')
on conflict (id) do nothing;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings"
  on public.site_settings for select
  using (true);

drop policy if exists "authenticated manage site settings" on public.site_settings;
create policy "authenticated manage site settings"
  on public.site_settings for update
  to authenticated
  using (id = 1)
  with check (id = 1);

alter publication supabase_realtime add table public.site_settings;
