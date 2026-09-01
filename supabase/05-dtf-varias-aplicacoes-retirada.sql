-- =============================================================
-- Kodara Private Label | parte 5
-- DTF com uma medida por aplicacao (em vez de uma medida so pra todas), e a
-- opcao de retirar na loja em vez de receber por frete.
--
-- Rode DEPOIS de schema.sql, 02, 03 e 04, uma vez, no SQL Editor.
-- E idempotente, pode rodar de novo sem quebrar nada.
-- =============================================================

alter table public.leads
  add column if not exists aplicacoes_detalhe jsonb,
  add column if not exists retirada_loja boolean;

-- "Moletom ou Corta-vento" virou so "Moletom" no quiz. Sem isso, a Edge
-- Function calcular-frete nao acharia mais o peso/caixa dessa peca pelo nome
-- exato (ela ja tem um fallback por "contem" pra nao quebrar se esquecer de
-- rodar isso, mas o nome certo aqui deixa tudo consistente).
update public.peso_estimado_pecas
  set tipo_peca = 'Moletom'
  where tipo_peca = 'Moletom ou Corta-vento';

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
    aplicacoes, aplicacoes_detalhe, cores, grade_tamanhos, tem_arte, arquivo_estampa_url,
    posicao_tamanho_estampa, prazo_desejado, nome, whatsapp,
    valor_estimado, preco_unitario, cep_destino, valor_frete_calculado, valor_total_com_frete,
    retirada_loja, kit_marca_itens, kit_marca_outros,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term
  )
  values (
    p_session_id, p_status::lead_status_enum, v_novo.etapa_atual,
    v_novo.estagio_marca, v_novo.tipo_peca, v_novo.quantidade, v_novo.tecnica_estampa,
    coalesce(v_novo.precisa_orientacao_tecnica, false),
    v_novo.modelagem_status, v_novo.modelagem, v_novo.tecido, v_novo.cores_estampa,
    v_novo.estampa_largura_cm, v_novo.estampa_altura_cm, v_novo.aplicacoes, v_novo.aplicacoes_detalhe,
    v_novo.cores, v_novo.grade_tamanhos, v_novo.tem_arte,
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
    -- Retirada na loja, igual Kit Marca: pode ser ligada e desligada de
    -- novo pelo cliente, entao um "nao quero mais" (false) precisa valer,
    -- nao pode ficar preso no coalesce esperando um valor "preenchido".
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
