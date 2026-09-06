const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatBRL(value: number) {
  return brl.format(value)
}

interface CondicoesPagamentoTexto {
  parcelamento_max: number
  taxas_parcelamento: Record<string, number> | null
  desconto_avista_pct: number
}

/** Percentual da maquininha pra uma quantidade de parcelas específica, se estiver configurado. */
export function taxaParcela(taxas: Record<string, number> | null, parcelas: number): number | null {
  const v = taxas?.[String(parcelas)]
  return typeof v === 'number' ? v : null
}

/** PREÇO_CARTÃO = valor_líquido_desejado / (1 - taxa), pra saber quanto cobrar em N parcelas sem perder a margem. */
export function precoComTaxaCartao(valorLiquido: number, taxaPct: number): number {
  return Number((valorLiquido / (1 - taxaPct / 100)).toFixed(2))
}

/**
 * Texto único das condições de pagamento, usado na tela final e na mensagem
 * de WhatsApp. Sem as taxas configuradas, não inventa percentual — só avisa
 * que ela é repassada e fica pra confirmar. Com as taxas configuradas, a
 * taxa varia por parcela (a da Kodara vai de ~4% em 1x até ~17% em 12x),
 * então mostra a faixa em vez de um número só.
 */
export function textoCondicoesPagamento(c: CondicoesPagamentoTexto): string {
  const valores = c.taxas_parcelamento ? Object.values(c.taxas_parcelamento) : []
  const parcelamento =
    valores.length > 0
      ? `Parcelamento em até ${c.parcelamento_max}x no cartão (taxa da maquininha repassada, de ${Math.min(...valores).toFixed(2)}% a ${Math.max(...valores).toFixed(2)}% conforme o número de parcelas — confirmamos o valor exato no WhatsApp)`
      : `Parcelamento em até ${c.parcelamento_max}x no cartão (taxa da maquininha repassada, confirmamos o valor exato no WhatsApp)`
  return `${parcelamento}, ou ${c.desconto_avista_pct}% de desconto no Pix à vista. Condições padrão, sujeitas a confirmação no WhatsApp.`
}

/** Mascara de telefone BR: (31) 99999-9999 e (31) 9999-9999. */
export function maskPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function phoneDigits(masked: string) {
  return masked.replace(/\D/g, '')
}

export function isValidPhone(masked: string) {
  const d = phoneDigits(masked)
  return d.length === 10 || d.length === 11
}

export function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Mascara de CEP: 30110-000 */
export function maskCep(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function cepDigits(masked: string) {
  return masked.replace(/\D/g, '')
}

export function isValidCep(masked: string) {
  return cepDigits(masked).length === 8
}

interface MedidasDtf {
  aplicacoes_detalhe?: { largura_cm: number; altura_cm: number }[] | null
  estampa_largura_cm?: number | null
  estampa_altura_cm?: number | null
}

/** "30x40cm" pra uma aplicação, "30x40cm + 20x20cm (2 aplicações)" pra mais de uma. */
export function dtfTexto(lead: MedidasDtf): string | null {
  const medidas = lead.aplicacoes_detalhe?.length
    ? lead.aplicacoes_detalhe
    : lead.estampa_largura_cm && lead.estampa_altura_cm
      ? [{ largura_cm: lead.estampa_largura_cm, altura_cm: lead.estampa_altura_cm }]
      : []
  if (!medidas.length) return null
  const partes = medidas.map((m) => `${m.largura_cm}x${m.altura_cm}cm`).join(' + ')
  if (medidas.length <= 1) return partes
  return `${partes} (${medidas.length} aplicações)`
}
