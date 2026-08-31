# Colocar o quiz no ar

Roteiro na ordem. São 5 etapas, dá pra fazer numa sentada.

**O que eu não consigo fazer por você:** entrar na sua conta da Hostinger ou do Supabase. Os dois
painéis exigem seu login, e eu não peço nem guardo senha sua. As etapas 1, 2 e 5 são cliques seus no
navegador. As etapas 3 e 4 são comandos que eu já deixei prontos.

---

## Etapa 1 · Supabase (~10 min)

O quiz não grava nada sem isso.

1. Entre em [supabase.com](https://supabase.com) e crie um projeto.
   - Região: **South America (São Paulo)**, é a mais perto de BH e dá menos latência.
   - Guarde a senha do banco que ele pedir pra criar.
2. Aguarde o projeto subir (uns 2 minutos).
3. Vá em **SQL Editor** e rode, nessa ordem, um de cada vez:
   - o conteúdo de `supabase/schema.sql`
   - o conteúdo de `supabase/02-frete-e-recuperacao.sql`
4. Vá em **Project Settings > API** e copie:
   - **Project URL** (fica `https://xxxxxxxx.supabase.co`)
   - a chave **anon public**

> A chave `service_role` que aparece nessa mesma tela **não** vai pro site. Ela ignora todas as regras
> de segurança. Só use no terminal, na etapa 3.

---

## Etapa 2 · Preencher o .env (~2 min)

Na pasta do projeto:

```bash
cp .env.example .env
```

Abra o `.env` e preencha:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_META_PIXEL_ID=1200831484761221
VITE_WHATSAPP_NUMBER=553132232356
VITE_PIX_KEY=sua-chave-pix-aqui
VITE_PRIVACY_URL=https://vistakodara.com.br/politica-de-privacidade
```

O build confere isso sozinho. Se faltar alguma obrigatória, ele para e diz qual, em vez de gerar um
site que sobe bonito e não grava lead nenhum.

`VITE_PRIVACY_URL` é opcional, mas vale preencher antes de rodar tráfego: o Meta pede que página de
captação de lead tenha uma política de privacidade acessível. Sem essa variável o site continua
funcionando, só que sem o link (o aviso de texto sobre uso dos dados aparece de qualquer jeito).

---

## Etapa 3 · Criar seu login do painel (~1 min)

Com a `service_role` key em mãos, no terminal:

```bash
SUPABASE_URL="https://xxxxxxxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJ...service_role..." \
npm run admin:create
```

Ele cria `contato.bauerlab@gmail.com` e mostra uma senha forte **uma vez só**. Copie pro gerenciador
de senhas na hora. Rodar de novo reseta a senha.

---

## Etapa 4 · Gerar o pacote (~1 min)

```bash
npm install
npm run pacote
```

Sai um `kodara-quiz.zip` (~150 kB) com o site inteiro pronto.

---

## Etapa 5 · Hostinger (~10 min)

### 5.1 Criar o subdomínio

1. hPanel > **Domínios > Subdomínios**
2. Criar `quiz` em `vistakodara.com.br`
3. Anote a pasta que ele criar, normalmente `public_html/quiz`

### 5.2 Subir o site

1. hPanel > **Arquivos > Gerenciador de Arquivos**
2. Entre na pasta do subdomínio
3. Apague o que estiver lá (a Hostinger costuma deixar um `index.html` de boas-vindas e uma pasta
   `default`)
4. Envie o `kodara-quiz.zip`
5. Botão direito no zip > **Extrair** > extrair ali mesmo
6. Apague o zip depois

**Confira:** o `index.html` tem que estar na **raiz** da pasta do subdomínio, não dentro de uma pasta
`dist`. Se ficou dentro de uma subpasta, mova o conteúdo pra cima.

**O `.htaccess` é obrigatório.** Ele faz o `/admin` funcionar quando alguém dá refresh. O gerenciador
esconde arquivos que começam com ponto: ligue **Mostrar arquivos ocultos** nas configurações do
gerenciador e confirme que ele está lá.

### 5.3 SSL

1. hPanel > **Segurança > SSL**
2. Instale o certificado gratuito no subdomínio
3. Ligue **Forçar HTTPS**

O certificado leva de alguns minutos até uma hora pra propagar. Antes disso o navegador pode reclamar
de site não seguro, e o Meta Pixel não dispara em HTTP. Não rode tráfego antes do cadeado aparecer.

---

## Checklist de que está no ar

Abra `https://quiz.vistakodara.com.br` **no celular**, que é de onde vem o tráfego:

- [ ] A logo aparece na abertura e some sozinha
- [ ] As mensagens entram com o efeito de digitando
- [ ] Responda o quiz inteiro até a tela final
- [ ] O botão do WhatsApp abre a conversa com o resumo preenchido
- [ ] Entre em `https://quiz.vistakodara.com.br/admin`, faça login, e o lead do teste está lá
- [ ] Dê **refresh** dentro do `/admin`. Se der 404, o `.htaccess` não subiu
- [ ] No Meta Events Manager, o teste aparece em Eventos de Teste

---

## Etapa 6 (opcional, depois) · Frete real

O quiz funciona sem isso: mostra "Frete calculado na hora de fechar com a gente" e segue normal. Pra
ligar o frete de verdade:

```bash
npm i -g supabase
supabase login
supabase link --project-ref SEU_PROJECT_REF

supabase secrets set SUPERFRETE_TOKEN="seu-token"
supabase secrets set SUPERFRETE_CEP_ORIGEM="00000000"
supabase secrets set SUPERFRETE_USER_AGENT="Kodara Quiz/1.0 (contato@vistakodara.com.br)"
supabase secrets set SUPERFRETE_SANDBOX="true"

supabase functions deploy calcular-frete
```

O `SUPERFRETE_CEP_ORIGEM` é o CEP de onde as peças saem. Eu não preenchi porque não invento endereço.

Teste no sandbox primeiro, confira o log em **Edge Functions > calcular-frete > Logs**, e só então
troque `SUPERFRETE_SANDBOX` pra `false`.

---

## Antes de rodar tráfego pago

Três coisas que ainda são valor de exemplo, não da Kodara:

1. **Tabela de preços.** As linhas do `schema.sql` vêm marcadas "EXEMPLO, substituir pelo valor real".
   Troque em `/admin` > Tabela de preços. Enquanto não trocar, o quiz mostra valor de mentira.
2. **Pesos das peças.** Camiseta 0,2 kg e moletom 0,6 kg são aproximação. Pese e ajuste, senão o frete
   sai torto.
3. **Chave PIX.** Confira se é a chave certa, ela aparece na tela final pro cliente pagar.
4. **Política de privacidade.** Se `VITE_PRIVACY_URL` ainda estiver vazia, preencha antes de rodar
   tráfego pago no Meta. Página de captação de lead sem link de privacidade é motivo comum de anúncio
   reprovado.

---

## Atualizar o site depois

```bash
npm run pacote
```

E repita a etapa 5.2. Toda vez que mudar qualquer `VITE_*` do `.env` (chave PIX, WhatsApp) precisa
buildar e subir de novo: essas variáveis são assadas no arquivo na hora do build.
