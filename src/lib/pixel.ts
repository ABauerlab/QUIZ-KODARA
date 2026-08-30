type Fbq = (...args: unknown[]) => void

declare global {
  interface Window {
    fbq?: Fbq
  }
}

type EventPayload = Record<string, unknown>

function send(kind: 'track' | 'trackCustom', name: string, payload?: EventPayload) {
  const fbq = window.fbq
  if (!fbq) return
  try {
    if (payload && Object.keys(payload).length) fbq(kind, name, payload)
    else fbq(kind, name)
  } catch {
    // Pixel nunca pode quebrar o funil.
  }
}

/** Monta value/currency so quando existe valor calculado. */
function money(value?: number | null): EventPayload {
  return typeof value === 'number' && value > 0 ? { value: Number(value.toFixed(2)), currency: 'BRL' } : {}
}

export const pixel = {
  quizStarted() {
    send('trackCustom', 'QuizStarted')
  },
  lead(value?: number | null, extra?: EventPayload) {
    send('track', 'Lead', { ...money(value), ...extra })
  },
  initiateCheckout(value?: number | null, extra?: EventPayload) {
    send('track', 'InitiateCheckout', { ...money(value), ...extra })
  },
  quizCompleted(value?: number | null, extra?: EventPayload) {
    send('trackCustom', 'QuizCompleted', { ...money(value), ...extra })
  },
  whatsappRedirect(value?: number | null, extra?: EventPayload) {
    send('trackCustom', 'WhatsAppRedirect', { ...money(value), ...extra })
  },
}
