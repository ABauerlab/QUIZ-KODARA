import { enviarEventoServidor, type Identidade } from './capi'

type Fbq = (...args: unknown[]) => void

declare global {
  interface Window {
    fbq?: Fbq
  }
}

type EventPayload = Record<string, unknown>

function randomEventId() {
  const c: Crypto = crypto
  if (typeof c.randomUUID === 'function') return c.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Monta value/currency so quando existe valor calculado. */
function money(value?: number | null): EventPayload {
  return typeof value === 'number' && value > 0 ? { value: Number(value.toFixed(2)), currency: 'BRL' } : {}
}

/**
 * Dispara o mesmo evento nos dois lados com o mesmo event_id: fbq no
 * navegador (Pixel) e a Edge Function capi-evento (Conversions API). O Meta
 * deduplica automaticamente quando os dois batem em event_name + event_id.
 */
function disparar(
  kind: 'track' | 'trackCustom',
  name: string,
  opts: { value?: number | null; extra?: EventPayload; identidade?: Identidade } = {},
) {
  const eventId = randomEventId()
  const payload = { ...money(opts.value), ...opts.extra }

  const fbq = window.fbq
  if (fbq) {
    try {
      fbq(kind, name, payload, { eventID: eventId })
    } catch {
      // Pixel nunca pode quebrar o funil.
    }
  }

  enviarEventoServidor(name, eventId, {
    value: opts.value,
    contentName: opts.extra?.content_name as string | undefined,
    identidade: opts.identidade,
  })
}

export const pixel = {
  quizStarted() {
    disparar('trackCustom', 'QuizStarted')
  },
  lead(value: number | null | undefined, identidade?: Identidade, extra?: EventPayload) {
    disparar('track', 'Lead', { value, extra, identidade })
  },
  initiateCheckout(value: number | null | undefined, identidade?: Identidade, extra?: EventPayload) {
    disparar('track', 'InitiateCheckout', { value, extra, identidade })
  },
  quizCompleted(value: number | null | undefined, identidade?: Identidade, extra?: EventPayload) {
    disparar('trackCustom', 'QuizCompleted', { value, extra, identidade })
  },
  whatsappRedirect(value: number | null | undefined, identidade?: Identidade, extra?: EventPayload) {
    disparar('trackCustom', 'WhatsAppRedirect', { value, extra, identidade })
  },
}
