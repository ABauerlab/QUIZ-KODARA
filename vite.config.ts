import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Evita puxar @types/node só por causa do process.cwd() usado pelo loadEnv.
declare const process: { cwd(): string }

/**
 * Resolve __SITE_URL__ no index.html com VITE_SITE_URL. Sem essa variável
 * ainda não existe domínio final pra publicar, então tira canonical e
 * og:url/og:image/twitter:image em vez de gerar tag com URL vazia ou
 * apontando pro lugar errado.
 */
function siteUrlPlugin(siteUrl: string): Plugin {
  return {
    name: 'kodara-site-url',
    transformIndexHtml(html) {
      if (!siteUrl) {
        return html
          .replace(/[ \t]*<link rel="canonical"[^>]*>\n?/, '')
          .replace(/[ \t]*<meta property="og:url"[^>]*>\n?/, '')
          .replace(/[ \t]*<meta property="og:image"[^>]*>\n?/, '')
          .replace(/[ \t]*<meta property="og:image:width"[^>]*>\n?/, '')
          .replace(/[ \t]*<meta property="og:image:height"[^>]*>\n?/, '')
          .replace(/[ \t]*<meta name="twitter:image"[^>]*>\n?/, '')
      }
      // split/join no lugar de replaceAll: o tsconfig do projeto mira ES2020.
      return html.split('__SITE_URL__').join(siteUrl)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')

  return {
    plugins: [react(), siteUrlPlugin(siteUrl)],
    build: {
      target: 'es2020',
      minify: 'terser',
      cssCodeSplit: true,
      terserOptions: {
        compress: { drop_console: true, drop_debugger: true },
      },
      rollupOptions: {
        output: {
          // Mantem o vendor React separado do codigo do quiz pra cache longo.
          manualChunks(id) {
            if (id.includes('node_modules/react')) return 'react'
          },
        },
      },
    },
  }
})
