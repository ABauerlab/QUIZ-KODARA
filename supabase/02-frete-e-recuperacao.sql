-- =============================================================
-- Kodara Private Label | parte 2
-- Frete real (SuperFrete) + recuperação de lead abandonado.
--
-- Rode DEPOIS do supabase/schema.sql, uma vez, no SQL Editor.
-- É idempotente, pode rodar de novo sem quebrar nada.
-- =============================================================

-- ------------------------------------------------------------
-- 1. Campos novos no lead
-- ------------------------------------------------------------
do $$ begin
  create type lead_status_enum as enum ('incompleto', 'completo', 'contatado');
exception when duplicate_object then null; end $$;

alter table public.leads
  add column if not exists session_id uuid,
  add column if not exists status lead_status_enum not null default 'incompleto',
  add column if not exists etapa_atual text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists cep_destino text,
  add column if not exists valor_frete_calculado numeric(10, 2),
  add column if not exists valor_total_com_frete numeric(10, 2);

-- session_id é a chave que amarra os salvamentos incrementais do mesmo visitante.
create unique index if not exists leads_session_id_key on public.leads (session_id);
create index if not exists leads_status_idx on public.leads (status, created_at desc);

-- ------------------------------------------------------------
-- 2. Peso e caixa estimados por tipo de peça
--    ATENÇÃO: valores de APROXIMAÇÃO, não são medidas reais da Kodara.
--    Servem só pra cotar frete. Ajuste no painel quando pesar as peças.
-- ------------------------------------------------------------
create table if not exists public.peso_estimado_pecas (
  id uuid primary key default gen_random_uuid(),
  tipo_peca text not null unique,
  peso_kg numeric(6, 3) not null,          -- por peça
  largura_cm integer not null,             -- da caixa
  comprimento_cm integer not null,         -- da caixa
  altura_unitaria_cm numeric(6, 2) not null, -- altura que cada peça soma na pilha
  observacao text
);

insert into public.peso_estimado_pecas
  (tipo_peca, peso_kg, largura_cm, comprimento_cm, altura_unitaria_cm, observacao)
values
  ('Camiseta',               0.200, 20, 30, 2.0, 'APROXIMAÇÃO, pesar e ajustar'),
  ('Moletom ou Corta-vento', 0.600, 25, 35, 4.0, 'APROXIMAÇÃO, pesar e ajustar'),
  ('Boné',                   0.150, 20, 20, 10.0, 'APROXIMAÇÃO, pesar e ajustar'),
  ('Ecobag',                 0.150, 20, 30, 1.5, 'APROXIMAÇÃO, pesar e ajustar')
on conflict (tipo_peca) do nothing;

alter table public.peso_estimado_pecas enable row level security;

-- Só o admin logado mexe. O quiz nunca lê isso direto: quem consulta é a
-- Edge Function, que roda com service role e ignora RLS.
drop policy if exists "admin gerencia pesos" on public.peso_estimado_pecas;
create policy "admin gerencia pesos" on public.peso_estimado_pecas
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- 3. Salvamento incremental sem abrir buraco de segurança
--
--    O quiz roda com a chave anônima exposta no navegador. Dar UPDATE
--    direto pro anon deixaria qualquer um sobrescrever lead alheio, porque
--    a policy não tem como saber de quem é a sessão. Então o anon não
--    ganha UPDATE nenhum: ele só chama esta função, que é SECURITY DEFINER
--    e só mexe na linha do próprio session_id.
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
  -- O anon nunca pode marcar um lead como 'contatado': isso é ação do admin.
  if p_status not in ('incompleto', 'completo') then
    raise exception 'status invalido';
  end if;

  v_novo := jsonb_populate_record(null::public.leads, p_dados);

  insert into public.leads as l (
    session_id, status, etapa_atual,
    estagio_marca, tipo_peca, quantidade, tecnica_estampa, precisa_orientacao_tecnica,
    modelagem_status, cores, grade_tamanhos, tem_arte, arquivo_estampa_url,
    posicao_tamanho_estampa, prazo_desejado, nome, whatsapp,
    valor_estimado, preco_unitario, cep_destino, valor_frete_calculado, valor_total_com_frete
  )
  values (
    p_session_id, p_status::lead_status_enum, v_novo.etapa_atual,
    v_novo.estagio_marca, v_novo.tipo_peca, v_novo.quantidade, v_novo.tecnica_estampa,
    coalesce(v_novo.precisa_orientacao_tecnica, false),
    v_novo.modelagem_status, v_novo.cores, v_novo.grade_tamanhos, v_novo.tem_arte,
    v_novo.arquivo_estampa_url, v_novo.posicao_tamanho_estampa, v_novo.prazo_desejado,
    v_novo.nome, v_novo.whatsapp, v_novo.valor_estimado, v_novo.preco_unitario,
    v_novo.cep_destino, v_novo.valor_frete_calculado, v_novo.valor_total_com_frete
  )
  on conflict (session_id) do update set
    -- coalesce pra que uma resposta que ainda não veio nunca apague o que já
    -- estava gravado. Um campo só sobe de vazio pra preenchido.
    status                     = excluded.status,
    etapa_atual                = coalesce(excluded.etapa_atual, l.etapa_atual),
    estagio_marca              = coalesce(excluded.estagio_marca, l.estagio_marca),
    tipo_peca                  = coalesce(excluded.tipo_peca, l.tipo_peca),
    quantidade                 = coalesce(excluded.quantidade, l.quantidade),
    tecnica_estampa            = coalesce(excluded.tecnica_estampa, l.tecnica_estampa),
    precisa_orientacao_tecnica = excluded.precisa_orientacao_tecnica,
    modelagem_status           = coalesce(excluded.modelagem_status, l.modelagem_status),
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
    updated_at                 = now()
  -- Lead que o Bauer já contatou não volta atrás por causa de uma aba velha aberta.
  where l.status <> 'contatado';
end;
$$;

revoke all on function public.salvar_lead(uuid, jsonb, text) from public;
grant execute on function public.salvar_lead(uuid, jsonb, text) to anon, authenticated;

-- Com a função no lugar, o anon não precisa mais de INSERT direto na tabela.
drop policy if exists "anon insere lead" on public.leads;

-- ------------------------------------------------------------
-- 4. Painel: marcar lead como contatado
-- ------------------------------------------------------------
-- Já coberto pela policy "admin edita leads" criada no schema.sql.
