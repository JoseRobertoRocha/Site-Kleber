

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  title                 text not null,
  category              text not null default '',
  lead                  text not null default '',
  description           text not null default '',
  case_color            text not null default '#FF6B2B',
  tags                  text[] not null default '{}',
  metrics               jsonb not null default '[]',
  main_image_url        text,
  gallery               jsonb not null default '[]',
  external_link_label   text,
  external_link_url     text,
  detail_quick_facts    jsonb not null default '[]',
  detail_paragraphs     jsonb not null default '[]',
  detail_highlight      text,
  detail_action_items   jsonb not null default '[]',
  featured              boolean not null default false,
  published             boolean not null default true,
  display_order         integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists projects_published_order_idx
  on public.projects (published, display_order);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

-- Habilita Realtime na tabela: o site publico escuta mudancas e atualiza
-- sozinho (sem F5) quando algo e publicado/editado/excluido no painel.
-- RLS continua se aplicando as mensagens que chegam pro cliente anonimo.
alter publication supabase_realtime add table public.projects;

drop policy if exists "public read published projects" on public.projects;
create policy "public read published projects"
  on public.projects for select
  using (published = true);

-- unico papel autenticado = o admin (login unico). Sem essa policy,
-- authenticated so enxerga o que a policy publica ja libera.
drop policy if exists "authenticated manage projects" on public.projects;
create policy "authenticated manage projects"
  on public.projects for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- Seed: conteudo atual do site, migrado 1:1 para nao perder nada.
-- ---------------------------------------------------------------------

insert into public.projects
  (slug, title, category, lead, description, case_color, tags, metrics,
   main_image_url, gallery, external_link_label, external_link_url,
   detail_quick_facts, detail_paragraphs, detail_highlight, detail_action_items,
   featured, published, display_order)
values
(
  'protelim-geo-ads-2024',
  'Protelim • 2024',
  'Geo Ads',
  'Geo Ads por raio • 15 revendas • 60 dias',
  'Campanha geolocalizada com anúncios por raio para aumentar a penetração da Protelim em revendas estratégicas. Pré-lançamento no PDV, mix promocional customizado, treinamento online e incentivo com bonificação.',
  '#80d91d',
  array['Geo Ads','Revendas','Trade Marketing','PDV'],
  '[{"value":25,"prefix":"+","suffix":"%","label":"Penetração"},{"value":18,"prefix":"+","suffix":"%","label":"Ticket médio"},{"value":20,"prefix":"+","suffix":"%","label":"Vendas do produto"}]'::jsonb,
  'img/projetos/protelin.png',
  '[]'::jsonb,
  null, null,
  '[{"label":"Ano","value":"2024"},{"label":"Foco","value":"15 revendas"},{"label":"Estratégia","value":"Geo Ads"}]'::jsonb,
  '["Em 2024, liderei uma campanha geolocalizada para aumentar a penetração da Protelim em revendas estratégicas. A partir da análise de KPIs como share de marca, ticket médio e potencial de compra, selecionei 15 revendas com alto potencial e baixa participação no mix.","Criamos anúncios segmentados para impactar clientes que estivessem em um raio de proximidade dessas revendas, garantindo que o público local visse a comunicação e fosse direcionado para comprar no ponto de venda."]'::jsonb,
  'Implementei um novo modelo de go-to-market, com pré-lançamento exclusivo para essas revendas antes da divulgação digital nacional. Assim, quando o cliente impactado pelas redes sociais visitasse a loja, já encontrava o produto disponível.',
  '["Mix promocional customizado","Treinamento online para vendedores","Campanha de incentivo","Bonificações para vendedores e revendas"]'::jsonb,
  true, true, 1
),
(
  'protcast-conexoes-que-geram-negocios',
  'Protcast — Conexões que Geram Negócios',
  'Podcast',
  'Conteúdo proprietário • Distribuição multicanal • Integração comercial',
  'Podcast com empresários e formadores de opinião do setor automotivo. Estratégia de conteúdo proprietário, distribuição multicanal e integração com o time comercial para gerar posicionamento, audiência e networking qualificado.',
  '#06b6d4',
  array['Podcast','Conteúdo Proprietário','Social Media','Networking'],
  '[{"value":30,"prefix":"+","suffix":"%","label":"Audiência nas redes"},{"value":120,"suffix":" mil","label":"Visualizações somadas"},{"value":18,"prefix":"+","suffix":"%","label":"Tráfego no site"},{"value":22,"suffix":"%","label":"Ouvintes convertidos em leads"}]'::jsonb,
  'img/projetos/Podcast.jpeg',
  '[]'::jsonb,
  'Assista o podcast →', 'https://www.instagram.com/p/C9AWsZlOl5E/',
  '[]'::jsonb, '[]'::jsonb, null, '[]'::jsonb,
  true, true, 2
),
(
  'estrategia-pdv-protelim',
  'Estratégia de PDV | Protelim',
  'PDV',
  'Criei a estratégia de contrapartidas para distribuição dos materiais de ponto de venda, alinhando marketing e comercial para aumentar a performance dos parceiros.',
  'As regras contemplavam metas de compra, reativação de clientes inativos e ações obrigatórias de exposição e divulgação da marca.',
  '#7c3cff',
  array['PDV','Trade Marketing','Revendas','Comercial'],
  '[{"value":20,"prefix":"+","suffix":"%","label":"Volume de pedidos"},{"value":15,"prefix":"+","suffix":"%","label":"Adesão da estratégia"},{"value":50,"prefix":"+","suffix":"%","label":"Engajamento dos parceiros"}]'::jsonb,
  'img/projetos/protelin.png',
  '[]'::jsonb,
  null, null,
  '[{"label":"Ano","value":"2024"},{"label":"Foco","value":"Revendas parceiras"},{"label":"Estratégia","value":"PDV"}]'::jsonb,
  '["Estruturei a política de utilização dos materiais de PDV em parceria com a equipe comercial, definindo critérios e contrapartidas para garantir maior retorno sobre o investimento da marca.","Os requisitos incluíram metas de volume de compras, reativação de clientes inativos há mais de 90 dias e ações de divulgação da marca nos canais digitais e físicos."]'::jsonb,
  'As regras contemplavam metas de compra, reativação de clientes inativos e ações obrigatórias de exposição e divulgação da marca, garantindo maior retorno sobre o investimento em PDV.',
  '["Critérios e contrapartidas para uso do PDV","Metas de volume de compras","Reativação de clientes inativos (90+ dias)","Ações obrigatórias de divulgação da marca"]'::jsonb,
  true, true, 3
),
(
  'marketing-roundtable-cadencia',
  'Marketing Roundtable',
  'E-mail',
  'Campanhas executivas com cadência, narrativa e automação para escalar conversões.',
  'Empresa americana especializada em cursos executivos. Desenvolvimento de campanhas de e-mail marketing, conteúdos promocionais e automações para aumentar alcance, engajamento e conversões.',
  '#7c3cff', '{}', '[]'::jsonb,
  'img/ftcases/Painel1/1.jpg',
  '[{"url":"img/ftcases/Painel1/2.jpg","alt":"Marketing Roundtable"}]'::jsonb,
  null, null, '[]'::jsonb, '[]'::jsonb, null, '[]'::jsonb,
  false, true, 4
),
(
  'marketing-roundtable-cursos',
  'Marketing Roundtable',
  'E-mail',
  'A Roundtable oferece cursos online e presenciais com os melhores especialistas do mundo.',
  'No e-mail ao lado foram divulgados alguns desses cursos e promoções especiais.',
  '#06b6d4', '{}', '[]'::jsonb,
  'img/ftcases/Painel2/3.jpg',
  '[{"url":"img/ftcases/Painel2/4.jpg","alt":"Marketing Roundtable"}]'::jsonb,
  null, null, '[]'::jsonb, '[]'::jsonb, null, '[]'::jsonb,
  false, true, 5
),
(
  'turotest-centromotion',
  'Turotest — CentroMotion',
  'E-mail',
  'A Turotest, empresa do grupo CentroMotion, é líder na fabricação de produtos para diversos setores, incluindo automotivo e industrial.',
  'Fornecedora destacada para principais montadoras agrícolas do país como CNH, Volvo, Scania, John Deere e Valtra. Para elaborar os e-mails marketing da Turotest, foi fundamental garantir uma abordagem personalizada e informativa, com informações detalhadas dos produtos, destacando sua qualidade, durabilidade e utilidade para clientes.',
  '#80d91d', '{}', '[]'::jsonb,
  'img/ftcases/Painel3/1.jpg',
  '[{"url":"img/ftcases/Painel3/2.jpg","alt":"Turotest — CentroMotion"}]'::jsonb,
  null, null, '[]'::jsonb, '[]'::jsonb, null, '[]'::jsonb,
  false, true, 6
),
(
  'phytus-farma-lancamento-produto',
  'Desenvolvimento e lançamento de um novo produto',
  'Phytus Farma',
  'Na época em que trabalhava em uma empresa farmacêutica, deparei-me com a preocupante realidade do uso excessivo de medicamentos para emagrecimento, como o Ozempic, que causavam danos significativos aos usuários devido aos seus efeitos colaterais.',
  'Reconhecendo a necessidade de uma alternativa mais segura, colaborei com P&D e iniciei um projeto após feiras e congressos para pesquisa de mercado, identificando demanda por soluções naturais e estabelecendo o objetivo de desenvolver um ativo 100% natural.',
  '#ff6b2b', '{}', '[]'::jsonb,
  'img/ftcases/Painel4/2.jpg',
  '[{"url":"img/ftcases/Painel4/Phytus%20Farma.jpg","alt":"Phytus Farma"}]'::jsonb,
  null, null, '[]'::jsonb, '[]'::jsonb, null, '[]'::jsonb,
  false, true, 7
),
(
  'phytus-farma-instagram',
  'Instagram',
  'Phytus Farma',
  'Fui responsável por criar textos persuasivos e envolventes (copy) que acompanhavam as postagens, capturando a atenção do público-alvo e incentivando engajamento.',
  'Criação de conteúdo visualmente atraente, alinhado à identidade da marca. Monitoramento de métricas e ajustes contínuos para otimização de resultados.',
  '#f43f5e', '{}', '[]'::jsonb,
  'img/ftcases/Painel5/1.jpg',
  '[{"url":"img/ftcases/Painel5/2.jpg","alt":"Phytus Farma — Instagram"}]'::jsonb,
  null, null, '[]'::jsonb, '[]'::jsonb, null, '[]'::jsonb,
  false, true, 8
),
(
  'oficialderma-lancamento',
  'Lançamento',
  'OficialDerma',
  'Responsável pela elaboração do slogan, tom de voz e alinhamento com os designers.',
  'Produção de catálogos, folders, e-mail marketing e banners para a campanha.',
  '#22c55e', '{}', '[]'::jsonb,
  'img/ftcases/Painel6/1.jpg',
  '[{"url":"img/ftcases/Painel6/2.jpg","alt":"OficialDerma — Lançamento"}]'::jsonb,
  null, null, '[]'::jsonb, '[]'::jsonb, null, '[]'::jsonb,
  false, true, 9
),
(
  'oficialfarma-dia-das-maes-2022',
  'Campanha Dia das Mães 2022',
  'OficialFarma',
  'Campanha focada em autoestima e autocuidado das mães com o slogan "a mãe tá on".',
  'Linguagem empoderadora, incentivo ao autocuidado e alinhamento com valores e propósito da marca.',
  '#38bdf8', '{}', '[]'::jsonb,
  'img/ftcases/Painel7/1.jpg',
  '[{"url":"img/ftcases/Painel7/2.jpg","alt":"OficialFarma — Dia das Mães 2022"}]'::jsonb,
  null, null, '[]'::jsonb, '[]'::jsonb, null, '[]'::jsonb,
  false, true, 10
),
(
  'oficialfarma-influenciadores-angela-borges',
  'INFLUENCIADORES - Angela Borges',
  'OficialFarma',
  'Na OficialFarma, todo conteúdo produzido pelos influenciadores era escrito e produzido por mim.',
  'Muitas vezes, também estive envolvido nas contratações (avaliação de compatibilidade com a marca e negociação). Em seguida, implementação das campanhas, monitoramento de desempenho, análise de vendas e ROI, e otimização contínua.',
  '#a855f7', '{}', '[]'::jsonb,
  'img/ftcases/Painel8/1.jpg',
  '[{"url":"img/ftcases/Painel8/2.jpg","alt":"OficialFarma — Angela Borges"}]'::jsonb,
  null, null, '[]'::jsonb, '[]'::jsonb, null, '[]'::jsonb,
  false, true, 11
),
(
  'phytus-farma-influenciadores-esteban-velasquez',
  'INFLUENCIADORES - Esteban Velasquez',
  'Phytus Farma',
  'Na Phytus Farma, assumi a contratação de influenciadores.',
  'Liderei desde a análise da persona e do mercado, pesquisa de compatibilidade, produção de conteúdo, análise do ROI e vendas, até feedback contínuo. Em colaboração com o Esteban, alcançamos resultados significativos em vendas e engajamento.',
  '#eab308', '{}', '[]'::jsonb,
  'img/ftcases/Painel9/1.jpg',
  '[{"url":"img/ftcases/Painel9/2.jpg","alt":"Phytus Farma — Esteban Velasquez"}]'::jsonb,
  null, null, '[]'::jsonb, '[]'::jsonb, null, '[]'::jsonb,
  false, true, 12
),
(
  'oficialfarma-influenciadores-tenente-breno',
  'INFLUENCIADORES - Tenente Breno',
  'OficialFarma',
  'Processo completo: avaliação de compatibilidade, negociação, relacionamento, desenvolvimento de conteúdo.',
  'Implementação de campanhas, monitoramento e análise de desempenho, análise de vendas e ROI, e otimização contínua.',
  '#14b8a6', '{}', '[]'::jsonb,
  'img/ftcases/Painel10/1.jpg',
  '[]'::jsonb,
  null, null, '[]'::jsonb, '[]'::jsonb, null, '[]'::jsonb,
  false, true, 13
),
(
  'ecommerce-vitha-omega-3',
  'Ômega 3',
  'E-commerce Vitha',
  'Textos para o e-commerce Vitha sobre Ômega 3.',
  'Construção de conteúdo focado em SEO e copywriting.',
  '#f97316', '{}', '[]'::jsonb,
  'img/ftcases/Painel11/1.jpg',
  '[{"url":"img/ftcases/Painel11/2.jpg","alt":"E-commerce Vitha — Ômega 3"}]'::jsonb,
  null, null, '[]'::jsonb, '[]'::jsonb, null, '[]'::jsonb,
  false, true, 14
)
on conflict (slug) do nothing;
