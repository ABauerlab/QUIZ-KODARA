# Quiz Private Label | Kodara Streetwear

Agente de atendimento de Private Label da Kodara em formato de conversa. Qualifica o lead que vem do
tráfego pago, calcula o valor da produção, mostra o PIX e joga a pessoa no WhatsApp com tudo resumido.

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

No painel do Supabase, abra o **SQL Editor** e rode o arquivo `supabase/schema.sql` inteiro, uma vez.
Ele cria:

- tabela `leads` com todas as respostas do quiz
- tabela `tabela_precos`
- bucket privado `estampas` (PNG, JPG e PDF, limite de 15MB)
- as políticas de Row Level Security
- 4 linhas de preço de exemplo

### 2. O que o RLS garante

O formulário roda com a chave anônima exposta no navegador, então as regras são:

| Quem | Pode |
| --- | --- |
| anônimo (visitante do quiz) | inserir lead, subir arquivo de estampa, ler a tabela de preços |
| autenticado (admin) | ler, editar e apagar leads, baixar estampas, editar a tabela de preços |

Ninguém sem login lê lead nenhum, nem lista arquivo de estampa. Os arquivos ficam num bucket privado
e o painel gera um link assinado de 10 minutos na hora do download.

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

## Painel admin

Fica em `/admin`, protegido por email e senha do Supabase Auth.

- **Leads**: lista dos mais recentes primeiro, com filtro por estágio da marca, técnica de estampa e se
  já tem arte pronta. Clica no lead pra abrir todas as respostas, baixar o arquivo de estampa e chamar
  a pessoa direto no WhatsApp.
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
- **Tela final**: salva o lead completo no Supabase antes de liberar o botão do WhatsApp. Se o banco
  falhar, o botão libera mesmo assim, com a mensagem pronta e um botão de tentar salvar de novo. Perder
  o registro é ruim, perder a venda é pior.

---

## Estrutura

```
src/
  components/Chat.tsx      balão, digitando, barra de progresso, header
  lib/                     env, supabase, pixel, formatação, tipos, precificação
  quiz/
    steps.ts               textos e ordem das perguntas, regra do pulo da P4
    useConversation.ts     fila de mensagens com o efeito de digitando
    Quiz.tsx               orquestra o fluxo
    Answers.tsx            a UI de resposta de cada pergunta
    UploadEstampa.tsx      upload pro bucket privado
    Final.tsx              resumo, valor, PIX e CTA (chunk separado)
  admin/                   painel, protegido por Auth (chunk separado)
supabase/schema.sql        tabelas, RLS, bucket e linhas de exemplo
scripts/create-admin.mjs   cria ou reseta a senha do admin
```
