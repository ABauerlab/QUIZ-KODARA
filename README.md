# Quiz Private Label | Kodara Streetwear

Agente de atendimento de Private Label da Kodara em formato de conversa. Qualifica o lead que vem do
tráfego pago, calcula o valor da produção mais o frete real até o CEP da pessoa, mostra o PIX e joga
ela no WhatsApp com tudo resumido. Quem abandona no meio fica registrado pra recontato.

Roda em `quiz.vistakodara.com.br`, build estático subido por upload manual na Hostinger.

Sinta-se livre, vista Kodara!

---

## Stack

React + Vite + TypeScript + Tailwind. Supabase pra banco, storage e login do admin. Meta Pixel pros
eventos de conversão.

Sem router, sem lib de animação, sem fonte externa. O painel admin, a tela final e o SDK do Supabase
saem em chunks separados, então a primeira tela do quiz carrega só o essencial.

Peso do primeiro carregamento (gzip): HTML 1,3 kB + CSS 3,4 kB + app 7,8 kB + React 60 kB.
O SDK do Supabase (55 kB gzip) só baixa depois que a página já pintou.

---

## Colocar no ar

O passo a passo completo está em **[DEPLOY.md](DEPLOY.md)**: Supabase, login do painel, pacote e
upload na Hostinger, com checklist de conferência no celular.

Se preferir delegar, **[PROMPT-DEPLOY.md](PROMPT-DEPLOY.md)** tem um prompt pronto pra colar numa
sessão com acesso a navegador, que executa esse roteiro inteiro.

---

## Rodando local

```bash
npm install
cp .env.example .env   # preencha os valores
npm run dev            # http://localhost:5173
```

Outros comandos:

```bash
npm run build      # confere o .env, roda o typecheck e gera dist/
npm run pacote     # build + kodara-quiz.zip pronto pra Hostinger
npm run preview    # serve o dist/ pra conferir antes de subir
npm run build:demo # build sem conferir o .env, só pra ver a interface
npm run typecheck
```

O `npm run build` falha de propósito se faltar variável obrigatória no `.env`, e também se alguém
colocar uma `service_role` key num `VITE_*`. Um build sem a chave do Supabase sobe bonito e não grava
lead nenhum, e isso só apareceria depois de queimar tráfego.

---

## Variáveis de ambiente

Arquivo `.env` na raiz, a partir do `.env.example`. Ele não vai pro git.

| Variável | O que é |
| --- | --- |
| `VITE_SUPABASE_URL` | URL do projeto, em Project Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Chave `anon` pública, mesma tela |
| `VITE_META_PIXEL_ID` | Pixel da Kodara: `1200831484761221` |
| `VITE_WHATSAPP_NUMBER` | Número no formato internacional sem símbolo: `553132232356` |
| `VITE_PIX_KEY` | Chave PIX mostrada na tela final |
| `VITE_PRIVACY_URL` | Opcional. Link da política de privacidade. Sem ela, o aviso de uso dos dados continua aparecendo, só que sem link |

Essas variáveis entram no bundle na hora do build. Trocou alguma, roda `npm run build` de novo e sobe
o `dist/` atualizado. Isso vale principalmente pra chave PIX.

Nunca coloque a `service_role` key no `.env`. Ela ignora todas as regras de segurança e o `.env` do
Vite vai parar no navegador.

---

## Configurando o Supabase

### 1. Banco, storage e segurança

No painel do Supabase, abra o **SQL Editor** e rode **dois arquivos, nessa ordem**, uma vez cada:

**`supabase/schema.sql`** cria:

- tabela `leads` com todas as respostas do quiz
- tabela `tabela_precos`
- bucket privado `estampas` (PNG, JPG e PDF, limite de 15MB)
- as políticas de Row Level Security
- 4 linhas de preço de exemplo

**`supabase/02-frete-e-recuperacao.sql`** (frete e recuperação de lead) cria:

- os campos `session_id`, `status`, `etapa_atual`, `cep_destino`, `valor_frete_calculado` e
  `valor_total_com_frete` no lead
- tabela `peso_estimado_pecas` com peso e caixa aproximados por peça
- a função `salvar_lead`, que é como o quiz grava resposta por resposta

Os dois são idempotentes, rodar de novo não quebra nada.

### 2. O que o RLS garante

O formulário roda com a chave anônima exposta no navegador, então as regras são:

| Quem | Pode |
| --- | --- |
| anônimo (visitante do quiz) | chamar `salvar_lead`, subir arquivo de estampa, ler a tabela de preços |
| autenticado (admin) | ler, editar e apagar leads, baixar estampas, editar preços e pesos |

Ninguém sem login lê lead nenhum, nem lista arquivo de estampa. Os arquivos ficam num bucket privado
e o painel gera um link assinado de 10 minutos na hora do download.

Sobre o salvamento incremental: o anon **não** tem UPDATE na tabela de leads. Se tivesse, qualquer um
poderia sobrescrever lead alheio, porque a policy não tem como saber de quem é a sessão. Em vez disso
ele só pode chamar a função `salvar_lead`, que é `security definer` e mexe unicamente na linha do
próprio `session_id`. A função também recusa marcar um lead como `contatado` (isso é só do painel) e
não deixa uma aba velha sobrescrever um lead que você já contatou.

Isso foi testado com os mesmos GRANTs que o Supabase aplica no schema public: como anon, o SELECT em
`leads` volta zero linhas, e INSERT, UPDATE e DELETE diretos são recusados pela RLS.

### 3. Criando o admin

Precisa da `service_role` key (Project Settings > API). Ela só é usada aqui no terminal, nunca no
código do site.

```bash
SUPABASE_URL="https://xxxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
npm run admin:create
```

Cria a conta `contato.bauerlab@gmail.com`, gera uma senha aleatória forte e mostra ela **uma única vez**
no terminal. Salve num gerenciador de senhas na hora.

Pra resetar a senha depois, é o mesmo comando: se a conta já existe, ele troca a senha e mostra a nova.
Pra criar outro admin, passa o email no fim:

```bash
SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." npm run admin:create -- outro@email.com
```

### 4. Preenchendo a tabela de preço real

**As linhas que vêm no `schema.sql` são exemplo, não são preço da Kodara.** Elas vêm marcadas com a
observação "EXEMPLO, substituir pelo valor real". Troque tudo antes de rodar tráfego.

Entre em `/admin`, aba **Tabela de preços**, e edite direto ali. Cada linha é uma faixa:

| Campo | O que é |
| --- | --- |
| `tecnica` | `silk` ou `dtf` |
| `tipo_peca` | tem que bater com o nome da peça do quiz: Camiseta, Moletom ou Corta-vento, Boné, Ecobag |
| `quantidade_min` / `quantidade_max` | faixa de quantidade, inclusiva nas duas pontas |
| `preco_unitario` | valor por peça |

O quiz procura a linha que casa técnica + peça + faixa de quantidade, e multiplica pelo total de peças.
Se não achar linha nenhuma, mostra **"Valor sob consulta"** e segue liberando o WhatsApp normalmente.
Nada trava e nada aparece zerado.

Quando o lead escolhe "não sei, quero indicação da Kodara", a estimativa usa silk acima de 30 peças e
DTF abaixo disso. A técnica final fica decidida no atendimento humano.

---

## Identidade visual

A base é a logo da Kodara, o wordmark em handstyle de grafite, branco sobre preto.

### Assets gerados

A logo virou **SVG inline** (`src/components/Logo.tsx`), traçada a partir do arquivo original. Inline
em vez de imagem por três motivos: some uma requisição do caminho crítico, o traço fica nítido em
qualquer tamanho, e a cor vem do `currentColor`, então a mesma logo serve header, splash e painel sem
gerar arquivo novo. Custa 2,7 kB gzip no bundle e economiza uma imagem de 16 kB.

| O que | Onde entra |
| --- | --- |
| `<Wordmark />` | tela de abertura, header, fecho da tela final, painel admin |
| `<MarcaK />` | o K sozinho, como foto de contato no header |
| `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png` | ícone de aba e de tela inicial |

O favicon usa só o **K**, não o wordmark inteiro: em 16px a palavra toda vira borrão. O K foi
recortado no vale entre ele e o O, então sai inteiro, com a perna, sem invadir a letra seguinte. O
fundo escuro é assado no ícone de propósito, senão o traço branco sumiria numa aba de tema claro.

No header o K aparece como avatar redondo e o wordmark como nome do contato, o que mantém a metáfora
de conversa de WhatsApp em vez de virar um cabeçalho de site.

### "Online"

O header mostra um statusinho verde de "online", igual perfil de contato ativo no WhatsApp e no
Instagram: uma bolinha verde (`#25D366`, o verde oficial do WhatsApp) no canto do avatar, e outra
pulsando ao lado do texto "online · responde rápido". É estático, sempre ligado, de propósito: não
depende de horário nem de status real de atendimento, é sinal visual de "isso aqui responde rápido",
não uma promessa literal de atendente humano online 24h. Se algum dia fizer sentido só mostrar
"online" em horário comercial, dá pra condicionar isso no `Header` de `src/components/Chat.tsx`.

### Paleta

A logo é preto e branco puro, então a interface é monocromática. **O branco é a cor de ação**: botão
primário, balão do usuário, barra de progresso.

| Token | Valor | Uso |
| --- | --- | --- |
| `ink` | `#0B0B0C` | fundo |
| `panel` | `#141416` | balão do sistema, cards |
| `line` | `#232326` | bordas e divisórias |
| `mute` | `#8A8A90` | texto secundário |
| `brand` | `#FFFFFF` | ações, destaque |

**Nota:** a primeira versão usava um verde limão que eu tinha inventado, sem nenhuma base. Como a
única evidência real de marca é a logo, e ela é monocromática, a interface passou a seguir isso. Se a
Kodara tiver uma cor oficial, é só trocar o valor de `brand` em `tailwind.config.js`, uma linha, e
todo o sistema acompanha.

### Tela de abertura

A splash mostra a logo em destaque por 1,4s e sai sozinha. **Ela não custa toque nem tempo de funil:**
a conversa já roda por baixo desde o primeiro render, então o "digitando" da primeira mensagem
acontece durante a splash. Quando ela sai, as três mensagens de abertura e o botão já estão lá. Um
toque em qualquer lugar pula na hora.

Isso importa porque o tráfego é pago: um brand moment que atrasa a primeira pergunta custa lead. Esse
não atrasa nada.

---

## Frete real (SuperFrete)

Depois do contato, o quiz pergunta o CEP e cota o frete de verdade. Peças e frete aparecem separados
na tela final: "Peças: R$ X. Frete: R$ Y. Total: R$ Z".

### Por que passa por uma Edge Function

O token do SuperFrete **não pode** ir pro navegador. Qualquer `VITE_*` acaba dentro do bundle, que é
um arquivo público. Então quem fala com o SuperFrete é a Edge Function `calcular-frete`, e o token
mora nos secrets do Supabase.

### Deploy da função

```bash
npm i -g supabase          # se ainda não tiver a CLI
supabase login
supabase link --project-ref SEU_PROJECT_REF

supabase secrets set SUPERFRETE_TOKEN="seu-token"
supabase secrets set SUPERFRETE_CEP_ORIGEM="30160040"       # R. Rio de Janeiro, 462 - Centro, BH
supabase secrets set SUPERFRETE_USER_AGENT="Kodara Quiz/1.0 (contato@vistakodara.com.br)"
supabase secrets set SUPERFRETE_SANDBOX="true"              # tire quando for pra valer

supabase functions deploy calcular-frete
```

O token sai em web.superfrete.com > Integrações > Desenvolvedores > Integrar. O `User-Agent` com
email de contato é exigido pela API deles.

`SUPERFRETE_CEP_ORIGEM` já é o CEP real da Kodara (R. Rio de Janeiro, 462 - Sl 2217 - Centro, Belo
Horizonte - MG, 30160-040). Enquanto o secret não for configurado no Supabase (rodar o `supabase
secrets set` acima é uma ação que só quem tem acesso à CLI logada no projeto pode fazer), a função
responde "não configurado" e o quiz mostra a mensagem de frete a combinar, sem quebrar.

### Peso e caixa

A cotação precisa de peso e dimensões, então a tabela `peso_estimado_pecas` guarda uma estimativa por
peça: camiseta 0,2 kg, moletom 0,6 kg, boné 0,15 kg, ecobag 0,15 kg. **São aproximações, não medidas
reais da Kodara**, todas marcadas com "APROXIMAÇÃO, pesar e ajustar" na coluna de observação. Pese as
peças e ajuste, senão o frete cotado sai torto.

A caixa é montada empilhando as peças (`altura_unitaria_cm` vezes a quantidade), respeitando os
mínimos de PAC e SEDEX (16 x 24 x 4 cm).

### Quando o frete não aparece

Em qualquer um desses casos o quiz mostra "Frete calculado na hora de fechar com a gente" e **segue
normalmente** pro WhatsApp. Nenhum deles trava a conversão:

| Situação | Motivo |
| --- | --- |
| API demorou mais de 5s | timeout, o quiz não espera |
| SuperFrete fora do ar ou token errado | falha da API |
| Secrets ainda não configurados | `nao_configurado` |
| Peça que não está na tabela de peso | não dá pra cotar honestamente |
| Volume acima do limite dos Correios | 30 kg, lado de 100 cm ou soma de 200 cm |

Esse último caso pega produção grande: 100 camisetas empilhadas passam de 100 cm de altura, e 60
moletons passam de 30 kg. Isso não é encomenda dos Correios, é transportadora fechada, e é resolvido
no atendimento em vez de chutar um valor.

### Sobre a documentação da API

O contrato usado (endpoint `POST /api/v0/calculator`, header `Authorization: Bearer`, corpo com
`from` / `to` / `products` / `services` / `options`) foi conferido no código do servidor MCP de apoio
da SuperFrete, em `codespar/mcp-dev-latam`. A doc oficial em `superfrete.readme.io` estava bloqueada
pelo proxy de rede da máquina onde isso foi construído, então **a leitura da resposta foi escrita de
forma defensiva**: aceita preço em texto ou número, ignora serviço que voltou com erro, escolhe o mais
barato e, se nada casar, cai no "frete a combinar" em vez de quebrar.

Vale fazer uma cotação de teste no sandbox depois de configurar o token e conferir o log da função.
Se a resposta vier em outro formato, o único ponto a mexer é a função `leCotacoes` em
`supabase/functions/calcular-frete/index.ts`.

O servidor MCP do `codespar/mcp-dev-latam` é ferramenta de desenvolvimento, pra explorar a API. Ele
não faz parte do runtime do site.

---

## Recuperação de lead abandonado

Antes, o lead só era gravado na tela final: quem respondia 6 perguntas e saía sumia sem rastro. Agora
**cada resposta grava**.

Como funciona: no início da sessão o navegador gera um `session_id` (guardado no `sessionStorage`, pra
que um refresh continue o mesmo lead em vez de duplicar). A cada resposta o quiz chama `salvar_lead`
com o estado inteiro. O campo `status` anda assim:

| Status | Quando |
| --- | --- |
| `incompleto` | começou a responder e ainda não terminou |
| `completo` | chegou na tela final e o briefing foi gravado |
| `contatado` | você marcou no painel depois de falar com a pessoa |

A gravação roda em background e nunca trava a tela. Se uma falhar, a resposta seguinte manda o estado
inteiro de novo e conserta sozinho. Um campo só sobe de vazio pra preenchido: resposta que ainda não
veio nunca apaga o que já estava gravado.

### No painel

A aba **Leads** ganhou botões de status no topo, com contador de incompletos. Em "Incompletos" você vê
quem parou, **em qual pergunta parou** e o WhatsApp, se a pessoa chegou até a P11 antes de sair.

Abrindo o lead tem o botão **Copiar mensagem de recontato**, com este texto:

> Fala, vi que você começou a montar seu pedido de private label aqui com a gente e não terminou.
> Ficou alguma dúvida? Bora finalizar juntos.

O disparo é manual por enquanto, de propósito: automatizar isso exigiria integrar a API do WhatsApp
Business, que é outra fase. Aqui a informação fica organizada e pronta pra agir.

Tem também **Marcar como contatado**, pra tirar da lista quem você já chamou.

---

## Aviso de privacidade

O quiz coleta nome, WhatsApp, CEP e às vezes um arquivo de arte, e roda com tráfego pago do Meta. Duas
coisas pedem isso:

- **LGPD**: informar a pessoa, no momento da coleta, sobre o que é feito com o dado.
- **Política do Meta**: página que capta lead precisa linkar uma política de privacidade acessível.
  É um motivo comum de anúncio reprovado ou conta sinalizada.

O quiz cobre os dois pontos:

- Um aviso curto aparece na P11 (nome e WhatsApp), o momento em que a pessoa entrega o dado mais
  sensível: *"Seus dados servem só pra fechar sua produção, a gente não vende nem compartilha com
  terceiros."*
- Um link **Privacidade** fica no header, visível desde a primeira tela, pra satisfazer o requisito do
  Meta de a página ter a política acessível, não só no momento da coleta.

Os dois dependem de `VITE_PRIVACY_URL`. Sem ela, o aviso de texto continua aparecendo (a LGPD não some
por falta de link), mas nenhum dos dois vira link clicável. Preencha com a política que já existe em
vistakodara.com.br antes de rodar tráfego. Isto não é aconselhamento jurídico: se a Kodara ainda não
tem uma política de privacidade publicada, vale confirmar com quem cuida disso antes de apontar o link.

---

## SEO e compartilhamento

### Card de compartilhamento (Open Graph / Twitter Card)

Quando alguém manda o link do quiz no WhatsApp, Instagram ou Facebook, aparece um card com título,
descrição e imagem em vez de um link pelado. Isso vem de `og:title`, `og:description`, `og:image`,
`og:url` e `twitter:card` no `<head>` do `index.html`.

A imagem é `public/og-image.jpg` (1200x630, a logo sobre o fundo preto da marca). Se a identidade
visual mudar, gere uma nova no mesmo tamanho e mesmo nome de arquivo.

`og:url`, `og:image` e o `canonical` dependem de `VITE_SITE_URL` (ver `.env.example`). Um plugin em
`vite.config.ts` resolve isso no build: com a variável preenchida, essas tags saem com a URL certa;
sem ela, o plugin **remove** as tags em vez de publicar `og:url=""` ou apontando pro lugar errado.
Título e descrição aparecem de qualquer jeito, só a imagem some.

Depois de trocar o link do WhatsApp/Instagram, ferramentas como WhatsApp e Facebook cacheiam o card
antigo por um tempo. Pra forçar atualização, use o [Sharing Debugger do Facebook](https://developers.facebook.com/tools/debug/)
colando a URL do site.

### Favicon e ícone de tela inicial

`public/favicon-32.png` e `public/apple-touch-icon.png` já existem e já estão linkados no
`index.html`. Se a aba do navegador ou o ícone ao adicionar à tela inicial ainda aparecerem sem ícone
depois de tudo isso, o problema não é o código: é o **site publicado estar atrás do repositório**
(deploy manual por zip não atualiza sozinho). Rode `npm run pacote` e suba o zip de novo.

### Indexação (`noindex`)

O `<meta name="robots" content="noindex, nofollow">` está ativo de propósito, decisão de quando o
sistema foi criado: esse quiz existe pra receber tráfego pago controlado (anúncio, link direto no
WhatsApp), não tráfego de busca orgânica. `noindex` não atrapalha quem chega pelo link (anúncio ou
WhatsApp) de jeito nenhum — só impede o Google de listar a página pra quem procura "Kodara private
label" por conta própria.

Isso é uma decisão de negócio, não técnica, e vale confirmar com quem toca a marca:

- **Manter `noindex`** (padrão atual) se o objetivo é manter esse funil só dentro do tráfego pago
  controlado, sem gente caindo nele por busca orgânica sem ter visto o anúncio antes.
  - **Cuidado**: com `noindex` mais o `public/robots.txt` desmarcado (`Disallow: /`), rodar Google
    Ads pra essa URL específica não é afetado, mas qualquer estratégia de SEO orgânico futura pra essa
    página não vai gerar frutos até isso ser revertido.
- **Tirar o `noindex`** se fizer sentido a página aparecer em busca depois que o conteúdo estiver
  validado. Nesse caso, tirar a tag no `index.html` e o `Disallow: /` do `public/robots.txt`, e
  considerar reescrever a copy pensando também em quem chega sem contexto nenhum de anúncio.

Pra trocar: `index.html`, remover a linha do `<meta name="robots">` e o comentário acima dela;
`public/robots.txt`, trocar `Disallow: /` por `Allow: /`.

---

## Painel admin

Fica em `/admin`, protegido por email e senha do Supabase Auth.

- **Leads**: lista dos mais recentes primeiro, com botões de status (todos, incompletos, terminaram, já
  contatados) e filtro por estágio da marca, técnica de estampa e se já tem arte pronta. Clica no lead
  pra abrir todas as respostas, ver peças, frete e total, baixar o arquivo de estampa e chamar a pessoa
  direto no WhatsApp.
- **Tabela de preços**: cria, edita e apaga faixas sem mexer no banco.
- **Chave PIX**: aparece na aba de preços só pra conferência. Pra trocar de fato, é no `.env` e um novo
  build, como está explicado ali na tela.

---

## Meta Pixel + Conversions API

Todo evento dispara nos **dois lados ao mesmo tempo**, com o mesmo `event_id`: o Pixel no navegador
(`fbq`) e a Conversions API no servidor (Edge Function `capi-evento`). O Meta deduplica sozinho quando
`event_name` + `event_id` batem dos dois lados — é isso que faz aparecer "Navegador e servidor" como
origem no Gerenciador de Eventos, e é o que sustenta a Pontuação de Qualidade do Evento (EMQ) mesmo
quando o navegador está com ad-blocker ou o Pixel não carrega.

Pixel `1200831484761221` instalado no `<head>`. O stub enfileira eventos na hora, mas o `fbevents.js`
só baixa quando o navegador fica ocioso ou no primeiro toque, pra não competir com a primeira pintura.

| Evento | Quando dispara |
| --- | --- |
| `PageView` | ao abrir (só Pixel, não passa pela Conversions API) |
| `QuizStarted` | clique em "Bora começar" |
| `Lead` | preencheu nome e WhatsApp na P11 |
| `InitiateCheckout` | tela final de resumo e valor apareceu |
| `QuizCompleted` | lead gravado no Supabase |
| `WhatsAppRedirect` | clique no botão final, antes de redirecionar |

`Lead`, `InitiateCheckout` e `QuizCompleted` mandam `value` e `currency: BRL` quando o valor foi
calculado, pra o Meta aprender a priorizar lead de ticket maior. Se o valor caiu em "sob consulta", o
evento vai sem `value` em vez de mandar zero e envenenar o aprendizado.

`InitiateCheckout` e `QuizCompleted` esperam o frete resolver antes de disparar, então o `value` deles
é o total que a pessoa vai pagar mesmo, peças mais frete. O `Lead` sai na P11, antes do CEP, então
leva só o valor das peças.

### Como funciona o lado servidor

`src/lib/pixel.ts` gera um `event_id` (UUID) por disparo e manda os dois lados com o mesmo id:

- `fbq(kind, name, payload, { eventID })` pro navegador
- `src/lib/capi.ts` faz um `fetch(..., { keepalive: true })` pra `capi-evento` com o mesmo `event_id`,
  mais `nome`/`whatsapp` (quando já coletados, a partir da P11), os cookies `_fbp`/`_fbc` (se
  existirem) e o `session_id` da sessão

`keepalive: true` importa porque `WhatsAppRedirect` dispara bem antes de `window.location.href`
navegar pra fora da página — sem isso, o navegador cancelaria a requisição no meio.

A Edge Function `capi-evento` (`supabase/functions/capi-evento/index.ts`):

1. Normaliza e **hasheia** (SHA-256) telefone e nome antes de qualquer coisa. O whatsapp vem sem
   código de país (formato brasileiro local); a função completa com `55` antes de hashear. PII crua
   nunca sai do Supabase, só o hash.
2. Usa `session_id` hasheado como `external_id` — chave de match adicional, sempre presente mesmo
   antes da P11 (quando ainda não há nome/telefone).
3. Pega `client_ip_address` do header `x-forwarded-for` e `client_user_agent` do próprio header da
   requisição (não confia no que o cliente diz que é seu user-agent, usa o que o servidor recebeu).
4. Manda pra `https://graph.facebook.com/v21.0/{pixel_id}/events` com o `access_token` dos secrets.
   Nunca bloqueia nem atrasa o quiz: se o secret não estiver configurado, responde `ok:false` sem
   erro, e falha de rede tem timeout de 5s.

O token da Conversions API **nunca** pode ir num `VITE_*` — ele autoriza escrever evento de conversão
na conta de anúncios. Mora nos secrets do Supabase, igual o token do SuperFrete. Deploy e secrets em
`DEPLOY.md`, etapa 7.

---

## Deploy na Hostinger

```bash
npm run build
```

Sobe **o conteúdo de dentro** da pasta `dist/` pra raiz do subdomínio `quiz.vistakodara.com.br`
(normalmente `public_html/quiz` ou a pasta que o subdomínio aponta). Não sobe a pasta `dist` inteira,
sobe o que tem dentro dela.

O `.htaccess` já vai junto no `dist/`. Ele manda qualquer rota pro `index.html`, o que faz `/admin`
funcionar mesmo se a pessoa der refresh, e cuida do cache: um ano de `immutable` só nos arquivos que o
Vite gera com hash no nome, e uma semana com revalidação na logo e nos ícones, que têm nome fixo. Se
fossem `immutable`, trocar a logo não chegaria em quem já visitou o site.

Se o `.htaccess` não aparecer no gerenciador de arquivos, liga a opção de mostrar arquivos ocultos.

---

## Como o fluxo se comporta

- **Menos de 30 peças**: pula a pergunta de técnica, fixa DTF e avisa que DTF produz a partir de 1 peça.
- **30 peças ou mais**: pergunta entre silk, DTF ou indicação da Kodara.
- **Começando do zero**: menciona o Kit Marca uma vez e segue com a peça.
- **Tem estampa pronta**: sobe o arquivo pro bucket privado. Se o upload falhar, oferece mandar pelo
  WhatsApp e o quiz continua.
- **CEP**: última pergunta, só pra cotar o frete. A cotação dispara na hora, então a tela final já abre
  com o número na maioria das vezes.
- **Tela final**: espera o frete resolver, salva o lead completo no Supabase e só então libera o botão
  do WhatsApp. Se o banco falhar, o botão libera mesmo assim, com a mensagem pronta e um botão de
  tentar salvar de novo. Perder o registro é ruim, perder a venda é pior.
- **Abandono em qualquer ponto**: o lead já está gravado como `incompleto`, com a etapa em que parou.
- **Corrigir uma resposta**: a seta no header volta pra pergunta anterior exatamente como ela estava,
  sem recalcular o caminho. Se a pessoa tinha pulado a P4 (menos de 30 peças) e volta até a P3, corrigir
  pra 40 peças faz a P4 aparecer; e vice-versa. Não tem seta na tela final nem antes da primeira
  pergunta. Cada correção também atualiza o lead salvo no Supabase, então quem abandona depois de
  corrigir fica registrado com o dado certo, não o errado.

---

## Estrutura

```
src/
  components/Chat.tsx      balão, digitando, barra de progresso, header
  lib/                     env, supabase, pixel, formatação, tipos, precificação
    frete.ts               chama a Edge Function de cotação
    leadStore.ts           session_id e salvamento incremental
  quiz/
    steps.ts               textos e ordem das perguntas, regra do pulo da P4
    useConversation.ts     fila de mensagens com o efeito de digitando
    Quiz.tsx               orquestra o fluxo
    Answers.tsx            a UI de resposta de cada pergunta
    UploadEstampa.tsx      upload pro bucket privado
    Final.tsx              resumo, peças, frete, total, PIX e CTA (chunk separado)
  admin/                   painel, protegido por Auth (chunk separado)
supabase/
  schema.sql               tabelas, RLS, bucket e linhas de exemplo
  02-frete-e-recuperacao.sql  frete, status do lead e a função salvar_lead
  functions/calcular-frete/   Edge Function que cota no SuperFrete
scripts/create-admin.mjs   cria ou reseta a senha do admin
```
