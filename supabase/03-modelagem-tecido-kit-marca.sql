-- =============================================================
-- Kodara Private Label | parte 3
-- Modelagem de camiseta (catalogo pronto), tecido, cores/tamanho de estampa
-- pro motor de custo, e o upsell de Kit Marca.
--
-- Rode DEPOIS do supabase/schema.sql e do supabase/02-frete-e-recuperacao.sql,
-- uma vez, no SQL Editor. E idempotente, pode rodar de novo sem quebrar nada.
-- =============================================================

-- ------------------------------------------------------------
-- 1. Campos novos no lead
--
--    modelagem_status (pronta/desenvolver) fica mantido pra nao perder
--    historico de leads antigos, mas o quiz para de escrever nele: agora a
--    modelagem de camiseta vem de um catalogo pronto (Oversized, Babylook...)
--    em vez de perguntar se o cliente quer "desenvolver do zero".
-- ------------------------------------------------------------
alter table public.leads
  add column if not exists modelagem text,
  add column if not exists tecido text,
  add column if not exists cores_estampa integer,
  add column if not exists estampa_largura_cm numeric(6, 1),
  add column if not exists estampa_altura_cm numeric(6, 1),
  add column if not exists aplicacoes integer,
  add column if not exists kit_marca_itens text[],
  add column if not exists kit_marca_outros text;

-- ------------------------------------------------------------
-- 2. salvar_lead: mesma funcao de sempre, so que aceitando os campos novos.
--    security definer, so mexe na linha do proprio session_id (ver
--    02-frete-e-recuperacao.sql pra explicacao completa da funcao).
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
    estagio_marca, tipo_peca, quantidade, tecnica_estampa, precisa_orientacao_tecnica,
    modelagem_status, modelagem, tecido, cores_estampa, estampa_largura_cm, estampa_altura_cm,
    aplicacoes, cores, grade_tamanhos, tem_arte, arquivo_estampa_url,
    posicao_tamanho_estampa, prazo_desejado, nome, whatsapp,
    valor_estimado, preco_unitario, cep_destino, valor_frete_calculado, valor_total_com_frete,
    kit_marca_itens, kit_marca_outros
  )
  values (
    p_session_id, p_status::lead_status_enum, v_novo.etapa_atual,
    v_novo.estagio_marca, v_novo.tipo_peca, v_novo.quantidade, v_novo.tecnica_estampa,
    coalesce(v_novo.precisa_orientacao_tecnica, false),
    v_novo.modelagem_status, v_novo.modelagem, v_novo.tecido, v_novo.cores_estampa,
    v_novo.estampa_largura_cm, v_novo.estampa_altura_cm, v_novo.aplicacoes,
    v_novo.cores, v_novo.grade_tamanhos, v_novo.tem_arte,
    v_novo.arquivo_estampa_url, v_novo.posicao_tamanho_estampa, v_novo.prazo_desejado,
    v_novo.nome, v_novo.whatsapp, v_novo.valor_estimado, v_novo.preco_unitario,
    v_novo.cep_destino, v_novo.valor_frete_calculado, v_novo.valor_total_com_frete,
    v_novo.kit_marca_itens, v_novo.kit_marca_outros
  )
  on conflict (session_id) do update set
    status                     = excluded.status,
    etapa_atual                = coalesce(excluded.etapa_atual, l.etapa_atual),
    estagio_marca              = coalesce(excluded.estagio_marca, l.estagio_marca),
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
    cores                      = coalesce(excluded.cores, l.cores),
    grade_tamanhos             = coalesce(excluded.grade_tamanhos, l.grade_tamanhos),
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
    -- Kit Marca pode ser escolhido, trocado ou zerado depois do resumo pronto:
    -- aqui NAO usa coalesce, senao um carrinho vazio nunca conseguiria substituir um anterior.
    kit_marca_itens            = excluded.kit_marca_itens,
    kit_marca_outros           = excluded.kit_marca_outros,
    updated_at                 = now()
  where l.status <> 'contatado';
end;
$$;

revoke all on function public.salvar_lead(uuid, jsonb, text) from public;
grant execute on function public.salvar_lead(uuid, jsonb, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 3. CEP de origem do frete mudou (SALA 2217, nao mais Sl 2217 -- mesmo
--    endereco, so formatacao -- e o CEP correto e 30160-041).
--    Isso NAO mexe em tabela nenhuma: e um secret do Supabase. Rode fora
--    daqui, uma vez, no terminal (troque a URL do projeto):
--
--    supabase secrets set SUPERFRETE_CEP_ORIGEM="30160041"
--    supabase functions deploy calcular-frete
-- ------------------------------------------------------------
