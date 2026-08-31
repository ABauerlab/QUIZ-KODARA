/**
 * Edge Function: capi-evento
 *
 * Reencaminha um evento pra Conversions API do Meta (server-side), com o
 * MESMO event_id que o Pixel do navegador já mandou pro mesmo evento. O Meta
 * deduplica os dois lados sozinho quando event_name + event_id batem — é
 * isso que faz o Gerenciador de Eventos mostrar "Navegador e servidor" como
 * origem e melhora a Pontuação de Qualidade do Evento (EMQ).
 *
 * Por que isso roda no backend e não no navegador: o access_token da
 * Conversions API tem permissão de escrever evento de conversão na conta de
 * anúncios. Nunca pode ir pro bundle público, então mora nos secrets do
 * Supabase, igual o token do SuperFrete em calcular-frete.
 *
 * PII (nome, telefone) é hasheada aqui, nunca em texto puro na chamada pro
 * Meta, seguindo a própria especificação deles (SHA-256, minúsculo, sem
 * espaço nas pontas). O navegador manda o dado cru só nessa chamada
 * servidor-a-servidor; o hash acontece só depois, logo antes de sair daqui.
 *
 * Secrets necessários (supabase secrets set):
 *   FB_ACCESS_TOKEN       token de sistema com permissão de Conversions API
 *                         nesse pixel (gerado no Meta Business Manager)
 *   META_PIXEL_ID         opcional, default 1200831484761221 (o mesmo da
 *                         VITE_META_PIXEL_ID do front, só que aqui do lado
 *                         do servidor)
 *   META_TEST_EVENT_CODE  opcional. Cola o código que aparece na aba "Testar
 *                         eventos" do Gerenciador de Eventos enquanto estiver
 *                         validando; tira depois, senão os eventos reais
 *                         ficam marcados como teste e não contam pra
 *                         otimização de campanha.
 */

const TIMEOUT_MS = 5000
const PIXEL_ID_PADRAO = '1200831484761221'
const GRAPH_VERSAO = 'v21.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

async function sha256(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Telefone normalizado pro padrão do Meta: só dígitos, com código do país. */
function normalizarTelefone(bruto: string): string | null {
  const digitos = bruto.replace(/\D/g, '')
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`
  if (digitos.length === 12 || digitos.length === 13) return digitos
  return null
}

interface Corpo {
  event_name?: string
  event_id?: string
  event_source_url?: string
  session_id?: string
  value?: number
  currency?: string
  content_name?: string
  nome?: string
  whatsapp?: string
  fbp?: string
  fbc?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ ok: false, motivo: 'metodo_invalido' }, 405)

  const token = Deno.env.get('FB_ACCESS_TOKEN')
  const pixelId = Deno.env.get('META_PIXEL_ID') || PIXEL_ID_PADRAO
  const testEventCode = Deno.env.get('META_TEST_EVENT_CODE')

  if (!token) {
    // Sem o secret configurado ainda. Isso e normal antes da etapa 7 do
    // DEPLOY.md: nao e erro do visitante, responde 200 pra nao gerar barulho
    // no client (que ja ignora a resposta de qualquer jeito).
    return json({ ok: false, motivo: 'nao_configurado' })
  }

  let body: Corpo
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, motivo: 'body_invalido' }, 400)
  }

  if (!body.event_name || !body.event_id) {
    return json({ ok: false, motivo: 'evento_invalido' }, 400)
  }

  const userData: Record<string, unknown> = {
    client_ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
    client_user_agent: req.headers.get('user-agent') || undefined,
    fbp: body.fbp || undefined,
    fbc: body.fbc || undefined,
  }

  if (body.session_id) userData.external_id = await sha256(body.session_id)

  if (body.whatsapp) {
    const telefone = normalizarTelefone(body.whatsapp)
    if (telefone) userData.ph = await sha256(telefone)
  }

  if (body.nome) {
    const partes = body.nome.trim().toLowerCase().split(/\s+/)
    if (partes[0]) userData.fn = await sha256(partes[0])
    if (partes.length > 1) userData.ln = await sha256(partes.slice(1).join(' '))
  }

  const customData: Record<string, unknown> = {}
  if (typeof body.value === 'number' && body.value > 0) {
    customData.value = Number(body.value.toFixed(2))
    customData.currency = body.currency || 'BRL'
  }
  if (body.content_name) customData.content_name = body.content_name

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: body.event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: body.event_id,
        event_source_url: body.event_source_url,
        action_source: 'website',
        user_data: userData,
        ...(Object.keys(customData).length ? { custom_data: customData } : {}),
      },
    ],
    access_token: token,
  }
  if (testEventCode) payload.test_event_code = testEventCode

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSAO}/${pixelId}/events`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const texto = await res.text()
    if (!res.ok) {
      console.error('Meta CAPI respondeu', res.status, texto)
      return json({ ok: false, motivo: 'api_erro' })
    }

    return json({ ok: true, evento: body.event_name })
  } catch (err) {
    console.error('Falha ao mandar evento pro Meta:', err instanceof Error ? err.message : err)
    return json({ ok: false, motivo: 'timeout' })
  } finally {
    clearTimeout(timeout)
  }
})
