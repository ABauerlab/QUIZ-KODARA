export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  pixelId: import.meta.env.VITE_META_PIXEL_ID ?? '',
  whatsapp: import.meta.env.VITE_WHATSAPP_NUMBER ?? '',
  pixKey: import.meta.env.VITE_PIX_KEY ?? '',
  /** Opcional. Sem ela, o site mostra o aviso de dados mas sem link de política. */
  privacyUrl: import.meta.env.VITE_PRIVACY_URL ?? '',
}

/**
 * VITE_SITE_URL não é lida em runtime (não tem uso dentro da UI): ela resolve
 * canonical/og:url/og:image direto no HTML, em vite.config.ts. Fica aqui só
 * documentado, pra achar fácil quando o domínio final trocar.
 */

export const supabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)
