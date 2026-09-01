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
   - o conteúdo de `supabase/03-modelagem-tecido-kit-marca.sql`
   - o conteúdo de `supabase/04-utm.sql`
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
supabase secrets set SUPERFRETE_CEP_ORIGEM="30160041"
supabase secrets set SUPERFRETE_USER_AGENT="Kodara Quiz/1.0 (contato@vistakodara.com.br)"
supabase secrets set SUPERFRETE_SANDBOX="true"

supabase functions deploy calcular-frete
```

`SUPERFRETE_CEP_ORIGEM` já vem preenchido com o CEP de onde as peças saem: R. Rio de Janeiro, 462 -
Sl 2217 - Centro, Belo Horizonte - MG, 30160-041. Confirme esse endereço antes de rodar o comando; a
função só usa o CEP (não a rua nem o número) pra cotar o frete.

Teste no sandbox primeiro, confira o log em **Edge Functions > calcular-frete > Logs**, e só então
troque `SUPERFRETE_SANDBOX` pra `false`.

---

## Etapa 7 (opcional, mas recomendado) · Conversions API do Meta

O quiz funciona sem isso: o Pixel do navegador continua disparando os 5 eventos normalmente. A
Conversions API é reforço — manda o mesmo evento pelo servidor também, o que melhora a Pontuação de
Qualidade do Evento e garante que o Meta recebe o sinal mesmo quando o navegador tem ad-blocker ou
Safari/iOS bloqueia o Pixel (o que é comum e crescente).

### 7.1 Gerar o token (só você consegue fazer essa parte)

1. Acesse [business.facebook.com](https://business.facebook.com), vá em **Configurações da Empresa**.
2. **Usuários > Usuários do sistema** > criar um usuário de sistema novo (ou usar um existente),
   com papel **Admin** ou pelo menos acesso à conta de anúncios que tem o pixel `1200831484761221`.
3. Nesse usuário de sistema, **Adicionar Ativos** > selecione o Pixel > dê permissão de **Gerenciar
   dados de eventos do pixel**.
4. **Gerar novo token** pra esse usuário de sistema, com a permissão `ads_management` (ou
   `business_management`, dependendo de como o Business Manager estiver organizado). Esse é o
   `FB_ACCESS_TOKEN`.
5. Guarde esse token num gerenciador de senhas assim que gerar. Ele não aparece de novo depois de
   fechar a tela.

### 7.2 Deploy da função

```bash
supabase secrets set FB_ACCESS_TOKEN="o-token-gerado-no-passo-anterior"
supabase secrets set META_TEST_EVENT_CODE="TEST12345"   # so enquanto estiver testando, ver 7.3

supabase functions deploy capi-evento
```

`META_PIXEL_ID` não precisa ser configurado: o padrão já é `1200831484761221`, o mesmo pixel do
front. Só defina esse secret se algum dia usar um pixel diferente.

### 7.3 Testar antes de confiar

1. No Gerenciador de Eventos, aba **Testar eventos**, copia o código que aparece lá
   (algo como `TEST12345`) e configura como `META_TEST_EVENT_CODE` acima.
2. Responde o quiz inteiro num navegador de verdade. Os eventos devem aparecer em tempo real na aba
   de teste, e cada um mostrando origem **"Navegador e servidor"** (não só "Navegador" nem só
   "Servidor") — é isso que confirma que o `event_id` está batendo dos dois lados e a deduplicação
   está funcionando.
3. Confere a **Pontuação de Qualidade do Evento** de cada evento na tela normal do Gerenciador de
   Eventos (fora da aba de teste, depois de alguns eventos reais acumularem).
4. **Importante**: depois de validar, **apague o secret `META_TEST_EVENT_CODE`**
   (`supabase secrets unset META_TEST_EVENT_CODE` e `supabase functions deploy capi-evento` de novo).
   Enquanto ele estiver configurado, todo evento real fica marcado como teste e **não entra na
   otimização de campanha**.

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
5. **Se configurou a Conversions API (etapa 7): confirme que `META_TEST_EVENT_CODE` foi removido.**
   Enquanto esse secret existir, todo evento real chega no Meta marcado como teste e não entra na
   otimização da campanha — silencioso, não trava nada, só some o sinal.

---

## Troca de domínio (feita)

O site saiu do domínio provisório da Hostinger e já está em `quiz.vistakodara.com.br`.
`VITE_SITE_URL` no `.env.example` já reflete isso — se o `.env` real usado no último build ainda
apontava pro domínio antigo, o `og:url`/`og:image`/`canonical` do site publicado estão errados até o
próximo `npm run pacote` com a variável certa.

Curl e WebFetch desta sessão não alcançam `vistakodara.com.br` (proxy de rede bloqueia o domínio, o
mesmo bloqueio de quando era o domínio provisório), então o que segue **não foi confirmado contra o
site publicado**, só contra o código. Confira manualmente:

1. **`og:url`/`canonical` no HTML publicado** apontam pra `https://quiz.vistakodara.com.br`, não pro
   domínio antigo. Ver o código-fonte da página (`Ctrl+U` no navegador) ou o
   [Sharing Debugger do Facebook](https://developers.facebook.com/tools/debug/).
2. **`VITE_META_PIXEL_ID` não muda.** É o mesmo pixel (`1200831484761221`), não é amarrado a domínio.
3. **Meta Business Manager > Configurações da Empresa > Domínios da Marca**: adicionar `vistakodara.com.br`
   e revalidar a verificação de domínio do pixel, se ainda não tiver feito. Sem isso alguns recursos
   do Pixel (Advanced Matching, Domain Verification) ficam associados só ao domínio antigo.
4. **CORS/allowed origins no Supabase**, se houver alguma regra restrita por domínio (Authentication >
   URL Configuration, e em qualquer Edge Function que valide `Origin`): confirma que
   `quiz.vistakodara.com.br` está autorizado.
5. **Rode o checklist inteiro da seção "Checklist de que está no ar"** nesse domínio, do zero — é o
   que efetivamente está recebendo tráfego agora.
6. **Anúncios ativos** (campanha `KODARA PRIVATE LABEL — WHATSAPP` ou qual for): confirma que já
   apontam pro domínio novo.
7. Considera um redirect 301 do domínio antigo pro novo em vez de simplesmente desligá-lo, caso algum
   link antigo ainda circule por aí.

---

## Atualizar o site depois

```bash
npm run pacote
```

E repita a etapa 5.2. Toda vez que mudar qualquer `VITE_*` do `.env` (chave PIX, WhatsApp, URL do
site) precisa buildar e subir de novo: essas variáveis são assadas no arquivo na hora do build.
