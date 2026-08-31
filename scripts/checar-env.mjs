/**
 * Confere o .env antes do build de producao.
 *
 * As variaveis VITE_* sao assadas no bundle na hora do build. Se faltar a chave
 * do Supabase, o site sobe bonito e nao grava lead nenhum, e voce so descobre
 * depois de queimar trafego. Entao o build falha aqui, de proposito.
 */
import { readFileSync, existsSync } from 'node:fs'

const ARQUIVO = '.env'

const OBRIGATORIAS = [
  ['VITE_SUPABASE_URL', 'URL do projeto Supabase (Project Settings > API)'],
  ['VITE_SUPABASE_ANON_KEY', 'chave anon publica (mesma tela)'],
  ['VITE_WHATSAPP_NUMBER', 'WhatsApp em formato internacional, ex 553132232356'],
  ['VITE_META_PIXEL_ID', 'ID do Meta Pixel'],
]

const RECOMENDADAS = [
  ['VITE_PIX_KEY', 'chave PIX da tela final, sem ela o bloco do PIX nao aparece'],
  ['VITE_SITE_URL', 'URL publica do site, sem ela o card de compartilhamento (og:image etc) some do HTML'],
]

if (!existsSync(ARQUIVO)) {
  console.error(`\n  Faltou o arquivo ${ARQUIVO}.`)
  console.error('  Rode: cp .env.example .env  e preencha os valores.\n')
  process.exit(1)
}

const env = {}
for (const linha of readFileSync(ARQUIVO, 'utf8').split('\n')) {
  const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const faltando = OBRIGATORIAS.filter(([k]) => !env[k])
const vazias = RECOMENDADAS.filter(([k]) => !env[k])

if (env.VITE_SUPABASE_URL && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(env.VITE_SUPABASE_URL)) {
  console.warn(`\n  Aviso: VITE_SUPABASE_URL nao parece uma URL de projeto Supabase.`)
  console.warn(`  Valor atual: ${env.VITE_SUPABASE_URL}`)
  console.warn('  O formato certo e https://xxxxxxxx.supabase.co\n')
}

if (env.VITE_WHATSAPP_NUMBER && !/^\d{12,13}$/.test(env.VITE_WHATSAPP_NUMBER)) {
  console.warn(
    `\n  Aviso: VITE_WHATSAPP_NUMBER deve ser so numeros com pais e DDD, ex 553132232356.\n  Valor atual: ${env.VITE_WHATSAPP_NUMBER}\n`,
  )
}

// A service role key ignora RLS. Num .env do Vite ela iria parar no navegador.
for (const chave of Object.keys(env)) {
  if (chave.startsWith('VITE_') && /SERVICE_ROLE/i.test(chave)) {
    console.error(`\n  PERIGO: ${chave} esta no .env do Vite.`)
    console.error('  A service role key ignora todas as regras de seguranca e ficaria publica')
    console.error('  dentro do bundle. Tire ela daqui antes de buildar.\n')
    process.exit(1)
  }
}

for (const [k, desc] of vazias) console.warn(`  Aviso: ${k} vazia (${desc}).`)

if (faltando.length) {
  console.error('\n  Build cancelado. Faltam variaveis obrigatorias no .env:\n')
  for (const [k, desc] of faltando) console.error(`    ${k}  ->  ${desc}`)
  console.error('\n  Sem elas o site sobe e nao grava lead nenhum.\n')
  process.exit(1)
}

console.log('  .env conferido, tudo que o build precisa esta preenchido.')
