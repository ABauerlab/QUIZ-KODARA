import { normalizePeca } from './normalizeText'
import { calcularPrecoPeca, custoBasePorTipoPeca } from './pricingEngine'
import { getSupabase } from './supabase'
import type { Lead, PrecoRow, TecnicaEstampa } from './types'

export { normalizePeca }

/** Camiseta e as modelagens do catalogo (Oversized, Babylook...) usam a etapa de modelagem/tecido. */
export function isCamiseta(tipoPeca: string | null | undefined): boolean {
  if (!tipoPeca) return false
  return normalizePeca(tipoPeca).includes('camiseta')
}

export interface PriceResult {
  /** null = sem faixa correspondente na tabela, cai em "Valor sob consulta". */
  total: number | null
  unitario: number | null
}

/**
 * Se o lead pediu indicacao da Kodara, a estimativa usa DTF, que atende
 * qualquer quantidade. A tecnica final fica definida no atendimento humano.
 */
export function tecnicaParaPreco(tecnica: TecnicaEstampa | null, quantidade: number): 'silk' | 'dtf' {
  if (tecnica === 'silk' || tecnica === 'dtf') return tecnica
  return quantidade >= 20 ? 'silk' : 'dtf'
}

export function calcularPreco(
  rows: PrecoRow[],
  tecnica: TecnicaEstampa | null,
  tipoPeca: string | null,
  quantidade: number | null,
): PriceResult {
  if (!quantidade || quantidade < 1 || !tipoPeca) return { total: null, unitario: null }

  const alvoTecnica = tecnicaParaPreco(tecnica, quantidade)
  const alvoPeca = normalizePeca(tipoPeca)

  const match = rows.find(
    (r) =>
      r.tecnica === alvoTecnica &&
      normalizePeca(r.tipo_peca) === alvoPeca &&
      quantidade >= r.quantidade_min &&
      quantidade <= r.quantidade_max,
  )

  if (!match) return { total: null, unitario: null }
  const unitario = Number(match.preco_unitario)
  if (!Number.isFinite(unitario) || unitario <= 0) return { total: null, unitario: null }

  return { total: Number((unitario * quantidade).toFixed(2)), unitario }
}

export interface PrecoLeadResult extends PriceResult {
  totalPix: number | null
  unitarioPix: number | null
  alertaProducao: string | null
}

const SEM_PRECO_LEAD: PrecoLeadResult = {
  total: null,
  unitario: null,
  totalPix: null,
  unitarioPix: null,
  alertaProducao: null,
}

/**
 * Ponto único de cálculo de preço usado no quiz: qualquer peça com custo real
 * cadastrado (camiseta, moletom, boné, ecobag) passa pelo motor de custo +
 * margem; peça sem custo cadastrado ainda cai na tabela de faixa de preço
 * plana, editável no admin.
 */
export function calcularPrecoLead(rows: PrecoRow[], lead: Lead): PrecoLeadResult {
  if (!lead.quantidade || lead.quantidade < 1 || !lead.tipo_peca) return SEM_PRECO_LEAD

  if (custoBasePorTipoPeca(lead.tipo_peca) !== null) {
    if (lead.tecnica_estampa !== 'silk' && lead.tecnica_estampa !== 'dtf') return SEM_PRECO_LEAD
    const r = calcularPrecoPeca({
      tipoPeca: lead.tipo_peca,
      quantidade: lead.quantidade,
      tecnica: lead.tecnica_estampa,
      coresEstampa: lead.cores_estampa,
      estampaLarguraCm: lead.estampa_largura_cm,
      estampaAlturaCm: lead.estampa_altura_cm,
      aplicacoes: lead.aplicacoes,
    })
    return {
      total: r.precoTotal,
      unitario: r.precoUnitario,
      totalPix: r.precoTotalPix,
      unitarioPix: r.precoUnitarioPix,
      alertaProducao: r.alerta?.mensagem ?? null,
    }
  }

  const r = calcularPreco(rows, lead.tecnica_estampa, lead.tipo_peca, lead.quantidade)
  return {
    ...r,
    totalPix: r.total !== null ? Number((r.total * 0.97).toFixed(2)) : null,
    unitarioPix: r.unitario !== null ? Number((r.unitario * 0.97).toFixed(2)) : null,
    alertaProducao: null,
  }
}

export async function fetchTabelaPrecos(): Promise<PrecoRow[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('tabela_precos')
    .select('id, tecnica, tipo_peca, quantidade_min, quantidade_max, preco_unitario, observacao')
    .order('tipo_peca')
    .order('tecnica')
    .order('quantidade_min')
  if (error) throw error
  return (data ?? []) as PrecoRow[]
}
