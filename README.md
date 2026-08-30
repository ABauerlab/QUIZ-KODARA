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

## Rodando local

```bash
npm install
cp .env.example .env   # preencha os valores
npm run dev            # http://localhost:5173
```

Outros comandos:

```bash
npm run build      # typecheck + gera dist/
npm run preview    # serve o dist/ pra conferir antes de subir
npm run typecheck
```

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
supabase secrets set SUPERFRETE_CEP_ORIGEM="00000000"       # CEP da Kodara em BH, só números
supabase secrets set SUPERFRETE_USER_AGENT="Kodara Quiz/1.0 (contato@vistakodara.com.br)"
supabase secrets set SUPERFRETE_SANDBOX="true"              # tire quando for pra valer

supabase functions deploy calcular-frete
```

O token sai em web.superfrete.com > Integrações > Desenvolvedores > Integrar. O `User-Agent` com
email de contato é exigido pela API deles.

**O `SUPERFRETE_CEP_ORIGEM` está vazio de propósito.** Não inventei o CEP da loja: coloque o CEP real
do endereço de onde as peças saem. Enquanto ele não estiver preenchido, a função responde "não
configurado" e o quiz mostra a mensagem de frete a combinar, sem quebrar.

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

## Meta Pixel

Pixel `1200831484761221` instalado no `<head>`. O stub enfileira eventos na hora, mas o `fbevents.js`
só baixa quando o navegador fica ocioso ou no primeiro toque, pra não competir com a primeira pintura.

| Evento | Quando dispara |
| --- | --- |
| `PageView` | ao abrir |
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

---

## Deploy na Hostinger

```bash
npm run build
```

Sobe **o conteúdo de dentro** da pasta `dist/` pra raiz do subdomínio `quiz.vistakodara.com.br`
(normalmente `public_html/quiz` ou a pasta que o subdomínio aponta). Não sobe a pasta `dist` inteira,
sobe o que tem dentro dela.

O `.htaccess` já vai junto no `dist/`. Ele faz duas coisas: manda qualquer rota pro `index.html`, o
que faz `/admin` funcionar mesmo se a pessoa der refresh, e liga cache longo nos arquivos com hash no
nome.

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
