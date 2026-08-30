import type { SupabaseClient } from '@supabase/supabase-js'
import { env, supabaseConfigured } from './env'

let clientPromise: Promise<SupabaseClient> | null = null

/**
 * Carrega o supabase-js sob demanda. A primeira tela do quiz nao precisa dele,
 * entao ele fica fora do bundle inicial.
 */
export function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseConfigured) {
    return Promise.reject(new Error('Supabase nao configurado. Preencha o .env.'))
  }
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      }),
    )
  }
  return clientPromise
}

/** Aquece o chunk do Supabase em background, sem bloquear nada. */
export function warmSupabase() {
  if (!supabaseConfigured) return
  const run = () => {
    void getSupabase().catch(() => {})
  }
  if ('requestIdleCallback' in window) {
    ;(window as Window & typeof globalThis).requestIdleCallback(run, { timeout: 3000 })
  } else {
    setTimeout(run, 1500)
  }
}
