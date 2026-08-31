/** Normaliza pra casar "Camiseta", "camisetas", "Moletom ou corta-vento". */
export function normalizePeca(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}
