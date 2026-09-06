-- =============================================================
-- Kodara Private Label | parte 6
-- Finalidade da peca (revenda ou nao), nome/instagram da marca do cliente,
-- condicoes de pagamento configuraveis, e retomada de progresso apos refresh.
--
-- Rode DEPOIS de schema.sql, 02, 03, 04 e 05, uma vez, no SQL Editor.
-- E idempotente, pode rodar de novo sem quebrar nada.
-- =============================================================

-- ------------------------------------------------------------
-- 1. Campos novos no lead
-- ------------------------------------------------------------
do $$ begin
  create type finalidade_peca_enum as enum ('revenda', 'nao_revenda');
exception when duplicate_object then null; end $$;

alter table public.leads
  add column if not exists finalidade_peca finalidade_peca_enum,
  add column if not exists nome_marca_cliente text,
  add column if not exists instagram_marca_cliente text,
  add column if not exists grade_indefinida boolean,
  add column if not exists estampa_medida_indefinida boolean;

-- ------------------------------------------------------------
-- 2. Condicoes de pagamento, editaveis pelo painel admin sem mexer em codigo.
--    Uma linha so (singleton). taxa_maquininha_pct comeca vazia de proposito:
--    e a unica que a Kodara nao confirmou ainda, entao o quiz mostra
--    "parcelamento em ate Nx (taxa da maquininha, confirmamos no WhatsApp)"
--    sem numero ate alguem preencher aqui.
-- ------------------------------------------------------------
create table if not exists public.condicoes_pagamento (
  id integer primary key default 1,
  parcelamento_max integer not null default 12,
  taxa_maquininha_pct numeric(5, 2),
  desconto_avista_pct numeric(5, 2) not null default 3.00,
  entrada_pct numeric(5, 2) not null default 50.00,
  updated_at timestamptz not null default now(),
  constraint condicoes_pagamento_singleton check (id = 1)
);

insert into public.condicoes_pagamento (id)
values (1)
on conflict (id) do nothing;

alter table public.condicoes_pagamento enable row level security;

drop policy if exists "todos leem condicoes pagamento" on public.condicoes_pagamento;
create policy "todos leem condicoes pagamento" on public.condicoes_pagamento
  for select to anon, authenticated using (true);

drop policy if exists "admin edita condicoes pagamento" on public.condicoes_pagamento;
create policy "admin edita condicoes pagamento" on public.condicoes_pagamento
  for update to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- 3. Retomada de progresso: o anon busca de volta só a própria sessão.
--    security definer, só lê (nunca escreve), e só devolve a linha com o
--    session_id exato que o navegador já guarda — que ninguém mais adivinha
--    porque é um uuid aleatório gerado no primeiro acesso.
-- ------------------------------------------------------------
create or replace function public.buscar_lead_por_sessao(p_session_id uuid)
returns setof public.leads
language sql
security definer
set search_path = public
stable
as $$
  select * from public.leads where session_id = p_session_id limit 1;
$$;

revoke all on function public.buscar_lead_por_sessao(uuid) from public;
grant execute on function public.buscar_lead_por_sessao(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 4. salvar_lead: mesma funcao, aceitando os 3 campos novos do lead.
-- ------------------------------------------------------------
create or replace function public.salvar_lead(
  p_session_id uuid,
  p_dados jsonb,
  p_status text default 'incompleto'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_novo public.leads;
begin
  if p_status not in ('incompleto', 'completo') then
    raise exception 'status invalido';
  end if;

  v_novo := jsonb_populate_record(null::public.leads, p_dados);

  insert into public.leads as l (
    session_id, status, etapa_atual,
    estagio_marca, finalidade_peca, nome_marca_cliente, instagram_marca_cliente,
    tipo_peca, quantidade, tecnica_estampa, precisa_orientacao_tecnica,
    modelagem_status, modelagem, tecido, cores_estampa, estampa_largura_cm, estampa_altura_cm,
    aplicacoes, aplicacoes_detalhe, estampa_medida_indefinida,
    cores, grade_tamanhos, grade_indefinida, tem_arte, arquivo_estampa_url,
    posicao_tamanho_estampa, prazo_desejado, nome, whatsapp,
    valor_estimado, preco_unitario, cep_destino, valor_frete_calculado, valor_total_com_frete,
    retirada_loja, kit_marca_itens, kit_marca_outros,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term
  )
  values (
    p_session_id, p_status::lead_status_enum, v_novo.etapa_atual,
    v_novo.estagio_marca, v_novo.finalidade_peca, v_novo.nome_marca_cliente, v_novo.instagram_marca_cliente,
    v_novo.tipo_peca, v_novo.quantidade, v_novo.tecnica_estampa,
    coalesce(v_novo.precisa_orientacao_tecnica, false),
    v_novo.modelagem_status, v_novo.modelagem, v_novo.tecido, v_novo.cores_estampa,
    v_novo.estampa_largura_cm, v_novo.estampa_altura_cm, v_novo.aplicacoes, v_novo.aplicacoes_detalhe,
    v_novo.estampa_medida_indefinida,
    v_novo.cores, v_novo.grade_tamanhos, v_novo.grade_indefinida, v_novo.tem_arte,
    v_novo.arquivo_estampa_url, v_novo.posicao_tamanho_estampa, v_novo.prazo_desejado,
    v_novo.nome, v_novo.whatsapp, v_novo.valor_estimado, v_novo.preco_unitario,
    v_novo.cep_destino, v_novo.valor_frete_calculado, v_novo.valor_total_com_frete,
    v_novo.retirada_loja, v_novo.kit_marca_itens, v_novo.kit_marca_outros,
    v_novo.utm_source, v_novo.utm_medium, v_novo.utm_campaign, v_novo.utm_content, v_novo.utm_term
  )
  on conflict (session_id) do update set
    status                     = excluded.status,
    etapa_atual                = coalesce(excluded.etapa_atual, l.etapa_atual),
    estagio_marca              = coalesce(excluded.estagio_marca, l.estagio_marca),
    finalidade_peca            = coalesce(excluded.finalidade_peca, l.finalidade_peca),
    nome_marca_cliente         = coalesce(excluded.nome_marca_cliente, l.nome_marca_cliente),
    instagram_marca_cliente    = coalesce(excluded.instagram_marca_cliente, l.instagram_marca_cliente),
    tipo_peca                  = coalesce(excluded.tipo_peca, l.tipo_peca),
    quantidade                 = coalesce(excluded.quantidade, l.quantidade),
    tecnica_estampa            = coalesce(excluded.tecnica_estampa, l.tecnica_estampa),
    precisa_orientacao_tecnica = excluded.precisa_orientacao_tecnica,
    modelagem_status           = coalesce(excluded.modelagem_status, l.modelagem_status),
    modelagem                  = coalesce(excluded.modelagem, l.modelagem),
    tecido                     = coalesce(excluded.tecido, l.tecido),
    cores_estampa              = coalesce(excluded.cores_estampa, l.cores_estampa),
    estampa_largura_cm         = coalesce(excluded.estampa_largura_cm, l.estampa_largura_cm),
    estampa_altura_cm          = coalesce(excluded.estampa_altura_cm, l.estampa_altura_cm),
    aplicacoes                 = coalesce(excluded.aplicacoes, l.aplicacoes),
    aplicacoes_detalhe         = coalesce(excluded.aplicacoes_detalhe, l.aplicacoes_detalhe),
    estampa_medida_indefinida  = coalesce(excluded.estampa_medida_indefinida, l.estampa_medida_indefinida),
    cores                      = coalesce(excluded.cores, l.cores),
    grade_tamanhos             = coalesce(excluded.grade_tamanhos, l.grade_tamanhos),
    grade_indefinida           = coalesce(excluded.grade_indefinida, l.grade_indefinida),
    tem_arte                   = coalesce(excluded.tem_arte, l.tem_arte),
    arquivo_estampa_url        = coalesce(excluded.arquivo_estampa_url, l.arquivo_estampa_url),
    posicao_tamanho_estampa    = coalesce(excluded.posicao_tamanho_estampa, l.posicao_tamanho_estampa),
    prazo_desejado             = coalesce(excluded.prazo_desejado, l.prazo_desejado),
    nome                       = coalesce(excluded.nome, l.nome),
    whatsapp                   = coalesce(excluded.whatsapp, l.whatsapp),
    valor_estimado             = coalesce(excluded.valor_estimado, l.valor_estimado),
    preco_unitario             = coalesce(excluded.preco_unitario, l.preco_unitario),
    cep_destino                = coalesce(excluded.cep_destino, l.cep_destino),
    valor_frete_calculado      = coalesce(excluded.valor_frete_calculado, l.valor_frete_calculado),
    valor_total_com_frete      = coalesce(excluded.valor_total_com_frete, l.valor_total_com_frete),
    retirada_loja              = excluded.retirada_loja,
    kit_marca_itens            = excluded.kit_marca_itens,
    kit_marca_outros           = excluded.kit_marca_outros,
    utm_source                 = coalesce(l.utm_source, excluded.utm_source),
    utm_medium                 = coalesce(l.utm_medium, excluded.utm_medium),
    utm_campaign               = coalesce(l.utm_campaign, excluded.utm_campaign),
    utm_content                = coalesce(l.utm_content, excluded.utm_content),
    utm_term                   = coalesce(l.utm_term, excluded.utm_term),
    updated_at                 = now()
  where l.status <> 'contatado';
end;
$$;

revoke all on function public.salvar_lead(uuid, jsonb, text) from public;
grant execute on function public.salvar_lead(uuid, jsonb, text) to anon, authenticated;
