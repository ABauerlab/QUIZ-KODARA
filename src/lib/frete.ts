import { env, supabaseConfigured } from './env'

export interface FreteOk {
  ok: true
  valor: number
  servico: string
  prazo_dias: number | null
}

export interface FreteFalha {
  ok: false
  motivo: string
}

export type FreteResultado = FreteOk | FreteFalha

/** Um pouco acima do timeout da Edge Function, pra ela conseguir responder primeiro. */
const TIMEOUT_MS = 6000

/**
 * Chama a Edge Function calcular-frete. O token do SuperFrete fica lá no
 * backend, nunca aqui. Qualquer falha vira ok:false e o quiz segue: perder a
 * cotação é chato, travar a conversão é pior.
 */
export async function calcularFrete(input: {
  cep_destino: string
  tipo_peca: string
  quantidade: number
}): Promise<FreteResultado> {
  if (!supabaseConfigured) return { ok: false, motivo: 'nao_configurado' }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${env.supabaseUrl}/functions/v1/calcular-frete`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.supabaseAnonKey}`,
        apikey: env.supabaseAnonKey,
      },
      body: JSON.stringify(input),
    })
    if (!res.ok) return { ok: false, motivo: `http_${res.status}` }

    const data = (await res.json()) as FreteResultado
    if (data && data.ok === true && Number.isFinite(data.valor) && data.valor > 0) return data
    return { ok: false, motivo: (data as FreteFalha)?.motivo ?? 'sem_cotacao' }
  } catch {
    return { ok: false, motivo: 'timeout' }
  } finally {
    clearTimeout(timeout)
  }
}
