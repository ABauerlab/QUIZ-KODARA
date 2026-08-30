export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  pixelId: import.meta.env.VITE_META_PIXEL_ID ?? '',
  whatsapp: import.meta.env.VITE_WHATSAPP_NUMBER ?? '',
  pixKey: import.meta.env.VITE_PIX_KEY ?? '',
}

export const supabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)
