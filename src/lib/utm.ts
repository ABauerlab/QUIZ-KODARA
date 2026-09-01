const CHAVE_UTM = 'kodara_quiz_utm'

export interface Utm {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

const CAMPOS: (keyof Utm)[] = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']

/**
 * Lê o UTM da URL de entrada e guarda no sessionStorage, pra sobreviver a
 * navegação interna e a um refresh no meio do quiz. Se a URL não tiver UTM
 * (visita direta, ou clique dentro do próprio quiz), mantém o que já tinha
 * sido capturado antes nessa sessão em vez de apagar.
 */
export function capturarUtm(): Utm | null {
  try {
    const params = new URLSearchParams(window.location.search)
    const daUrl: Utm = {}
    for (const campo of CAMPOS) {
      const v = params.get(campo)
      if (v) daUrl[campo] = v.slice(0, 100)
    }

    if (Object.keys(daUrl).length) {
      sessionStorage.setItem(CHAVE_UTM, JSON.stringify(daUrl))
      return daUrl
    }

    const salvo = sessionStorage.getItem(CHAVE_UTM)
    return salvo ? (JSON.parse(salvo) as Utm) : null
  } catch {
    // Navegação privada ou storage bloqueado: só não rastreia origem, não quebra o quiz.
    return null
  }
}

/** Tag curta e discreta pra fechar a mensagem de WhatsApp, ex: "camp-verao/anuncio-1". */
export function utmParaTag(utm: Utm | null): string {
  if (!utm) return ''
  const partes = [utm.utm_campaign, utm.utm_content].filter(Boolean)
  if (partes.length) return partes.join('/')
  const fallback = [utm.utm_source, utm.utm_medium].filter(Boolean)
  return fallback.join('/')
}
