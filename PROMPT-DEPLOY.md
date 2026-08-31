# Prompt pra colar no Cowork

Cole o bloco abaixo numa sessão nova do Cowork. Antes de colar, **deixe já aberto e logado no
navegador**: sua conta do Supabase e o hPanel da Hostinger. Assim o Claude Chrome usa a sessão que
você já abriu e ninguém precisa passar senha.

---

```
Você vai colocar no ar o quiz de Private Label da Kodara Streetwear. O código
já está pronto e testado, sua função é publicar, não reescrever.

REPOSITÓRIO
github.com/ABauerlab/QUIZ-KODARA
branch: claude/kodara-private-label-quiz-lmf9bd

Clone a branch e leia o DEPLOY.md antes de começar. Ele tem o roteiro
completo; use este prompt como plano de execução e o DEPLOY.md como
referência de detalhe.

O QUE É
Quiz em formato de conversa de WhatsApp que qualifica lead de private label
vindo de tráfego pago, calcula valor e frete, mostra PIX e joga a pessoa no
WhatsApp com o briefing pronto. Backend em Supabase, front estático que roda
na Hostinger em quiz.vistakodara.com.br.

REGRAS QUE NÃO PODEM SER QUEBRADAS
1. Nunca me peça senha. Se precisar de um painel logado, use o navegador com
   a sessão que eu já deixei aberta, ou me peça pra fazer o login eu mesmo.
2. A chave service_role do Supabase NUNCA entra no arquivo .env nem em
   nenhuma variável VITE_*. Ela ignora todas as regras de segurança e o .env
   do Vite vai parar dentro do bundle público. Ela só é usada uma vez, no
   terminal, no comando de criar o admin.
3. Não invente preço, peso de peça, prazo de produção nem CEP. Onde faltar
   dado real, deixe o valor de exemplo e me avise no fim.
4. Não mexa na lógica do quiz, nos textos ou no visual. Se achar um bug de
   verdade, me fale antes de corrigir.

FAÇA NESTA ORDEM

ETAPA 1 - Supabase
- Crie um projeto novo. Região South America (São Paulo).
- No SQL Editor, rode na ordem, um de cada vez:
  a) supabase/schema.sql
  b) supabase/02-frete-e-recuperacao.sql
- Confirme que rodaram sem erro e que as tabelas leads, tabela_precos e
  peso_estimado_pecas existem.
- Em Project Settings > API, pegue a Project URL e a chave anon public.

ETAPA 2 - .env
- cp .env.example .env
- Preencha:
  VITE_SUPABASE_URL     = a Project URL
  VITE_SUPABASE_ANON_KEY = a chave anon public
  VITE_META_PIXEL_ID    = 1200831484761221
  VITE_WHATSAPP_NUMBER  = 553132232356
  VITE_PIX_KEY          = me pergunte, eu te passo
  VITE_PRIVACY_URL      = link da política de privacidade da Kodara, se já
                          existir em vistakodara.com.br. Se não souber qual
                          é, me pergunte em vez de inventar; sem ela o site
                          funciona mas fica sem o link.
- Não commite o .env.

ETAPA 3 - Login do painel
- Rode npm run admin:create passando SUPABASE_URL e
  SUPABASE_SERVICE_ROLE_KEY como variáveis de ambiente no próprio comando.
- Ele mostra uma senha forte uma única vez. Me entregue essa senha e me
  diga pra guardar no gerenciador de senhas agora.

ETAPA 4 - Pacote
- npm install
- npm run pacote
- Isso confere o .env, builda e gera kodara-quiz.zip (~150 kB).
- Se a checagem do .env reclamar, resolva o que ela apontar. Ela existe
  justamente pra impedir um site que sobe bonito e não grava lead nenhum.

ETAPA 5 - Hostinger
- hPanel > Domínios > Subdomínios: crie "quiz" em vistakodara.com.br.
  Anote a pasta (normalmente public_html/quiz).
- hPanel > Arquivos > Gerenciador de Arquivos: entre nessa pasta e apague o
  que estiver lá (a Hostinger deixa um index.html de boas-vindas e às vezes
  uma pasta default).
- Envie o kodara-quiz.zip, extraia ali mesmo, apague o zip depois.
- CONFIRA DUAS COISAS, são as que mais quebram:
  a) o index.html está na RAIZ da pasta do subdomínio, não dentro de uma
     subpasta. Se ficou dentro de uma, mova o conteúdo pra cima.
  b) o .htaccess subiu. Ligue "mostrar arquivos ocultos" nas configurações
     do gerenciador pra enxergar. Sem ele, dar refresh em /admin dá 404.
- hPanel > Segurança > SSL: instale o certificado gratuito no subdomínio e
  ligue Forçar HTTPS. Pode levar até uma hora pra propagar.

ETAPA 6 - Conferir de verdade
Não me diga que está no ar sem ter testado. Abra
https://quiz.vistakodara.com.br numa janela em tamanho de celular e:
- a logo aparece na abertura e some sozinha
- as mensagens entram com o efeito de digitando
- responda o quiz inteiro até a tela final
- o botão do WhatsApp abre a conversa com o resumo preenchido
- entre em /admin, faça login com a senha da etapa 3, e o lead do teste
  está lá
- dê refresh dentro do /admin. Se der 404, o .htaccess não subiu
- confirme que o cadeado do HTTPS aparece. O Meta Pixel não dispara em HTTP

ME AVISE NO FIM
- a URL no ar e se o SSL já propagou
- a senha do admin
- que a tabela de preços ainda está com valores de EXEMPLO e que eu preciso
  trocar em /admin antes de rodar tráfego, senão o quiz mostra valor de
  mentira pro cliente
- que os pesos das peças são aproximação e precisam ser ajustados
- que o frete real ainda não está ligado, e o quiz mostra "Frete calculado
  na hora de fechar com a gente" até eu configurar
- se VITE_PRIVACY_URL ficou vazia, avise que o link de privacidade não vai
  aparecer no site e que isso pode reprovar anúncio no Meta

NÃO FAÇA AGORA
A etapa do frete (SuperFrete) fica pra depois. Ela precisa do token da
conta e do CEP de onde as peças saem, e eu ainda não te passei nenhum dos
dois. Está documentada no DEPLOY.md, etapa 6.

Se travar em qualquer ponto, me mostre o erro exato em vez de tentar
contornar por fora.
```
