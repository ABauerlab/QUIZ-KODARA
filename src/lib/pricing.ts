import { getSupabase } from './supabase'
import type { PrecoRow, TecnicaEstampa } from './types'

/** Normaliza pra casar "Camiseta", "camisetas", "Moletom ou corta-vento". */
export function normalizePeca(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
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
  return quantidade >= 30 ? 'silk' : 'dtf'
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
