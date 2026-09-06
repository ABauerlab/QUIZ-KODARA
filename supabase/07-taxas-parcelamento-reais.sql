-- =============================================================
-- Kodara Private Label | parte 7
-- Taxa da maquininha varia por parcela (a Kodara usa Link de Pagamento,
-- mesma taxa pra todas as bandeiras), então uma taxa única não bastava.
-- Substitui taxa_maquininha_pct por um mapa "quantidade de parcelas -> %".
--
-- Rode DEPOIS de schema.sql, 02, 03, 04, 05 e 06, uma vez, no SQL Editor.
-- E idempotente, pode rodar de novo sem quebrar nada.
-- =============================================================

alter table public.condicoes_pagamento
  add column if not exists taxas_parcelamento jsonb;

-- Valores reais informados pela Kodara (Link de Pagamento, todas as bandeiras).
update public.condicoes_pagamento
set taxas_parcelamento = '{
  "1": 4.20, "2": 6.09, "3": 7.01, "4": 7.91, "5": 8.80, "6": 9.67,
  "7": 12.59, "8": 13.42, "9": 14.25, "10": 15.06, "11": 15.87, "12": 16.66
}'::jsonb
where id = 1 and taxas_parcelamento is null;

-- taxa_maquininha_pct (percentual único) fica substituída pelo mapa acima.
alter table public.condicoes_pagamento
  drop column if exists taxa_maquininha_pct;
