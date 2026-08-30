-- =============================================================
-- Kodara Private Label | schema completo
-- Rode isso no SQL Editor do Supabase, do começo ao fim, uma vez.
-- =============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. Tabela de leads
-- ------------------------------------------------------------
do $$ begin
  create type estagio_marca_enum as enum ('existente', 'nova');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tecnica_estampa_enum as enum ('silk', 'dtf', 'indicacao');
exception when duplicate_object then null; end $$;

do $$ begin
  create type modelagem_status_enum as enum ('pronta', 'desenvolver');
exception when duplicate_object then null; end $$;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  estagio_marca estagio_marca_enum,
  tipo_peca text,
  quantidade integer,
  tecnica_estampa tecnica_estampa_enum,
  precisa_orientacao_tecnica boolean not null default false,
  modelagem_status modelagem_status_enum,
  cores text,
  grade_tamanhos jsonb,
  tem_arte boolean,
  arquivo_estampa_url text,
  posicao_tamanho_estampa text,
  prazo_desejado text,
  nome text,
  whatsapp text,
  valor_estimado numeric(10, 2),
  preco_unitario numeric(10, 2)
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- ------------------------------------------------------------
-- 2. Tabela de preços (editável pelo painel admin)
-- ------------------------------------------------------------
create table if not exists public.tabela_precos (
  id uuid primary key default gen_random_uuid(),
  tecnica text not null check (tecnica in ('silk', 'dtf')),
  tipo_peca text not null,
  quantidade_min integer not null,
  quantidade_max integer not null,
  preco_unitario numeric(10, 2) not null,
  observacao text,
  created_at timestamptz not null default now(),
  check (quantidade_max >= quantidade_min)
);

create index if not exists tabela_precos_busca_idx
  on public.tabela_precos (tecnica, tipo_peca, quantidade_min, quantidade_max);

-- ------------------------------------------------------------
-- 3. Row Level Security
--    O formulário roda com a chave anônima exposta no navegador, então:
--    anon só INSERE lead. Ler, editar e apagar é só pro admin logado.
-- ------------------------------------------------------------
alter table public.leads enable row level security;
alter table public.tabela_precos enable row level security;

drop policy if exists "anon insere lead" on public.leads;
create policy "anon insere lead" on public.leads
  for insert to anon, authenticated with check (true);

drop policy if exists "admin le leads" on public.leads;
create policy "admin le leads" on public.leads
  for select to authenticated using (true);

drop policy if exists "admin edita leads" on public.leads;
create policy "admin edita leads" on public.leads
  for update to authenticated using (true) with check (true);

drop policy if exists "admin apaga leads" on public.leads;
create policy "admin apaga leads" on public.leads
  for delete to authenticated using (true);

-- A tabela de preços precisa ser lida pelo quiz (anon) pra calcular o valor,
-- mas só o admin logado escreve nela.
drop policy if exists "todos leem precos" on public.tabela_precos;
create policy "todos leem precos" on public.tabela_precos
  for select to anon, authenticated using (true);

drop policy if exists "admin escreve precos" on public.tabela_precos;
create policy "admin escreve precos" on public.tabela_precos
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- 4. Storage: bucket privado das estampas
--    anon envia arquivo, só o admin logado lê e baixa.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'estampas',
  'estampas',
  false,
  15728640, -- 15MB
  array['image/png', 'image/jpeg', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 15728640,
      allowed_mime_types = array['image/png', 'image/jpeg', 'application/pdf'];

drop policy if exists "anon envia estampa" on storage.objects;
create policy "anon envia estampa" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'estampas');

drop policy if exists "admin le estampas" on storage.objects;
create policy "admin le estampas" on storage.objects
  for select to authenticated
  using (bucket_id = 'estampas');

drop policy if exists "admin apaga estampas" on storage.objects;
create policy "admin apaga estampas" on storage.objects
  for delete to authenticated
  using (bucket_id = 'estampas');

-- ------------------------------------------------------------
-- 5. Linhas de exemplo da tabela de preços
--    ATENÇÃO: esses valores são PLACEHOLDER, não são preço real da Kodara.
--    Troque tudo no painel admin antes de rodar tráfego.
-- ------------------------------------------------------------
insert into public.tabela_precos (tecnica, tipo_peca, quantidade_min, quantidade_max, preco_unitario, observacao)
values
  ('dtf',  'Camiseta', 1,  29,   45.00, 'EXEMPLO, substituir pelo valor real'),
  ('silk', 'Camiseta', 30, 59,   32.00, 'EXEMPLO, substituir pelo valor real'),
  ('silk', 'Camiseta', 60, 9999, 28.00, 'EXEMPLO, substituir pelo valor real'),
  ('dtf',  'Camiseta', 30, 9999, 38.00, 'EXEMPLO, substituir pelo valor real')
on conflict do nothing;
