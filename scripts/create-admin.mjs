/**
 * Cria (ou reseta) a conta de admin do painel.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-admin.mjs [email]
 *
 * A service role key fica em Project Settings > API > service_role.
 * NUNCA coloque essa chave no .env do front nem no repositorio: ela ignora RLS.
 * A senha e gerada na hora e mostrada uma unica vez aqui no terminal.
 */
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.argv[2] || 'contato.bauerlab@gmail.com'

if (!url || !serviceKey) {
  console.error('Faltou SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no ambiente.')
  process.exit(1)
}

function gerarSenha() {
  // 24 caracteres base64url, forte o bastante e facil de copiar.
  return randomBytes(18).toString('base64url')
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
const senha = gerarSenha()

const { data: lista, error: erroLista } = await admin.auth.admin.listUsers({ perPage: 1000 })
if (erroLista) {
  console.error('Erro ao listar usuarios:', erroLista.message)
  process.exit(1)
}

const existente = lista.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

if (existente) {
  const { error } = await admin.auth.admin.updateUserById(existente.id, { password: senha })
  if (error) {
    console.error('Erro ao resetar a senha:', error.message)
    process.exit(1)
  }
  console.log(`\nSenha resetada para ${email}`)
} else {
  const { error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })
  if (error) {
    console.error('Erro ao criar o admin:', error.message)
    process.exit(1)
  }
  console.log(`\nAdmin criado: ${email}`)
}

console.log(`Senha (aparece uma vez so): ${senha}`)
console.log('Guarde num gerenciador de senhas agora. Rode o script de novo pra resetar.\n')
