/**
 * Empacota o dist/ num zip pronto pra subir no Gerenciador de Arquivos da
 * Hostinger. O zip guarda o CONTEUDO do dist, sem a pasta em volta, entao
 * descompactar dentro do subdominio ja deixa o index.html no lugar certo.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, rmSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SAIDA = 'kodara-quiz.zip'

if (!existsSync('dist')) {
  console.error('\n  Nao achei a pasta dist/. Rode o build antes.\n')
  process.exit(1)
}
if (!existsSync('dist/index.html')) {
  console.error('\n  dist/ existe mas nao tem index.html. Build incompleto.\n')
  process.exit(1)
}
if (!existsSync('dist/.htaccess')) {
  // Sem ele, dar refresh em /admin devolve 404 na Hostinger.
  console.error('\n  Faltou o .htaccess no dist/. Confira se public/.htaccess existe.\n')
  process.exit(1)
}

if (existsSync(SAIDA)) rmSync(SAIDA)

// -r recursivo, o ponto inclui arquivos ocultos como o .htaccess
execFileSync('zip', ['-r', '-q', join('..', SAIDA), '.'], { cwd: 'dist' })

function tamanho(dir) {
  return readdirSync(dir, { withFileTypes: true }).reduce((total, e) => {
    const p = join(dir, e.name)
    return total + (e.isDirectory() ? tamanho(p) : statSync(p).size)
  }, 0)
}

const kb = (n) => `${(n / 1024).toFixed(0)} kB`
console.log(`\n  ${SAIDA} gerado.`)
console.log(`  Conteudo: ${kb(tamanho('dist'))} | Zip: ${kb(statSync(SAIDA).size)}`)
console.log('\n  Na Hostinger: Gerenciador de Arquivos > pasta do subdominio >')
console.log('  apaga o que tiver la > envia esse zip > botao direito > Extrair.')
console.log('  O index.html tem que ficar na RAIZ da pasta, nao dentro de dist/.\n')
