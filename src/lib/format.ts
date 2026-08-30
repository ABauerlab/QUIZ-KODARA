const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatBRL(value: number) {
  return brl.format(value)
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
