import { env, supabaseConfigured } from './env'
import { getSessionId } from './leadStore'

export interface Identidade {
  nome?: string | null
  whatsapp?: string | null
}

interface EventoServidor {
  value?: number | null
  contentName?: string
  identidade?: Identidade
}

function lerCookie(nome: string): string | undefined {
  const m = document.cookie.match(new RegExp('(?:^|; )' + nome + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : undefined
}

/**
 * Manda o mesmo evento pro backend (Edge Function calcular-frete's irmã,
 * capi-evento), que reencaminha pra Conversions API do Meta com o mesmo
 * event_id do Pixel do navegador. O Meta deduplica os dois lados sozinho
 * quando event_name + event_id batem, e é isso que aparece como "Navegador e
 * servidor" na Pontuação de Qualidade do Evento.
 *
 * _fbp e _fbc são os cookies que o próprio Pixel guarda; manda-los junto
 * melhora o match sem precisar coletar mais nada da pessoa.
 *
 * Nunca bloqueia nem quebra o funil: falha em silêncio, com keepalive pra
 * sobreviver mesmo quando o evento é disparado bem antes de sair da página
 * (como o WhatsAppRedirect, que dispara e navega quase junto).
 */
export function enviarEventoServidor(eventName: string, eventId: string, opts: EventoServidor = {}) {
  if (!supabaseConfigured) return
  try {
    const valor = typeof opts.value === 'number' && opts.value > 0 ? opts.value : undefined
    const body = {
      event_name: eventName,
      event_id: eventId,
      event_source_url: window.location.href,
      session_id: getSessionId(),
      value: valor,
      currency: valor ? 'BRL' : undefined,
      content_name: opts.contentName,
      nome: opts.identidade?.nome ?? undefined,
      whatsapp: opts.identidade?.whatsapp ?? undefined,
      fbp: lerCookie('_fbp'),
      fbc: lerCookie('_fbc'),
    }
    void fetch(`${env.supabaseUrl}/functions/v1/capi-evento`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.supabaseAnonKey}`,
        apikey: env.supabaseAnonKey,
      },
      body: JSON.stringify(body),
    }).catch(() => {})
  } catch {
    // CAPI é reforço de sinal, nunca pode quebrar o funil.
  }
}
