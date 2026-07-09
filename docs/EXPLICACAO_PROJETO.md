# Explicação do Projeto HouseApp

## Visão geral

O **HouseApp** é um monorepo TypeScript de **gestão financeira pessoal por organização**, centrado em **contas** (Nubank, Itaú, dinheiro, investimentos) e **transações** de primeira classe.

Três aplicações:

| Parte | Stack | Papel |
|-------|-------|-------|
| `api/` | Fastify 5, Drizzle, PostgreSQL, Zod, JWT, Swagger | Regra de negócio, persistência, jobs, OpenAPI |
| `web/` | React 19, Vite, TanStack Router/Query, Zustand, shadcn, Orval | Interface principal |
| `chrome-extension/` | MV3 (JS estático) | Notificações e ações rápidas |

Documentação relacionada:

- [PLANO_REDESIGN_FINANCEIRO.md](./PLANO_REDESIGN_FINANCEIRO.md) — decisões e roadmap do redesign
- [TODOS_INCONSISTENCIAS.md](./TODOS_INCONSISTENCIAS.md) — pendências técnicas

---

## Domínio principal

Cada **organização** possui:

- **Contas** (`accounts`) — corrente, poupança, cartão, dinheiro, investimento
- **Cartões** (`cards`) — vinculados a contas `credit_card` (físico, virtual, adicional)
- **Transações** (`transactions`) — avulsas, recorrentes materializadas ou importadas
- **Categorias** (`categories`) — hierárquicas (substituem `tags`)
- **Recorrências** (`recurring_transactions`) — templates que geram transações
- **Divisões** (`transaction_splits` + `split_payments`) — quem deve parte de uma despesa
- **Faturas** (`statements`) — importação PDF com deduplicação por hash
- **Anexos** (`transaction_attachments`) — arquivos por transação (storage local/S3)
- **Alertas** (`alert_rules` + `notifications`) — WhatsApp, in-app, extension

**Lembretes** não têm tabela própria: são transações `pending` + regras de alerta.

Paradigma contábil: **single-entry** (valores em centavos, `bigint`).

---

## Estrutura do monorepo

```
houseapp/
├── api/                 # Backend
├── web/                 # Frontend
├── chrome-extension/    # Extensão Chrome
├── docs/                # Documentação técnica
├── deploy/              # Configs de deploy
├── scripts/             # Setup de ambiente
├── biome.json           # Lint/format
└── package.json         # Scripts raiz (prepare, test, precommit)
```

---

## Backend (`api/`)

### Stack

- Fastify 5 + `fastify-type-provider-zod`
- Drizzle ORM + driver `postgres`
- PostgreSQL
- JWT (magic link)
- Swagger/OpenAPI → `api/swagger.json`
- `node-cron` + `JobRegistry`
- Storage de anexos: local ou S3 (`api/src/core/storage/`)

### Bootstrap

`api/src/http/server.ts`:

1. setup/migrações do banco (`api/src/db/setup.ts`)
2. registro de jobs
3. monitor de conexão
4. servidor Fastify + shutdown gracioso

`api/src/http/utils/setup.ts`: CORS, JWT, Swagger, serialização de `bigint` (amounts como decimal string na API).

### Organização do código

O domínio financeiro vive em **módulos verticais**:

```
api/src/modules/
├── accounts/          # Contas
├── cards/             # Cartões
├── categories/        # Categorias
├── transactions/      # Transações
├── recurring/         # Recorrências
├── splits/            # Divisões e pagamentos parciais
├── statements/        # Import de faturas
├── attachments/       # Anexos
├── reports/           # summary, by-account, by-category
├── alerts/            # alert_rules + notifications
├── ai/                # Chat SSE + action confirm/reject
└── auth/              # Sign-in/up/validate/logout
```

Padrão por módulo: `*.routes.ts` → `*.controller.ts` → `*.service.ts` → `*.repository.ts` (+ `*.schema.ts`).

**Injeção de dependências:** `api/src/core/container.ts` instancia repositórios e serviços.

**Legado ainda presente:**

- `api/src/domain/` — organização, usuário, convite, WhatsApp, helpers de IA (`report-context`, `portfolio-context`)
- `api/src/http/routes/` — org, user, invite, health, **jobs**
- `api/src/http/schemas/` — schemas antigos de transação/chat (não usados pelos módulos novos)

Rotas registradas em `api/src/http/routes/index.ts`.

### Banco de dados

Schemas Drizzle: `api/src/db/schemas/` (16 tabelas).

Migration inicial: `api/.migrations/0000_init.sql`.

Entidades:

| Grupo | Tabelas |
|-------|---------|
| Identidade | `users`, `organizations`, `organization_members`, `invites` |
| Financeiro | `accounts`, `cards`, `categories`, `transactions`, `recurring_transactions`, `transaction_categories` |
| Divisões | `transaction_splits`, `split_payments` |
| Import/anexos | `statements`, `transaction_attachments` |
| Alertas | `alert_rules`, `notifications` |

Modelo de transação (resumo):

- Entidade **principal** — não depende de série para existir
- `recurring_transaction_id` nullable = avulsa ou import
- `source`: `manual` | `import` | `recurring` | `ai_chat`
- `counterparty` texto livre (ex.: "João", "Netflix")
- `description` = notas (substitui chat legado)

### API — superfície principal

Prefixo org-scoped: `/organizations/:slug/...`

| Domínio | Exemplos |
|---------|----------|
| Auth | `POST /auth/sign-in`, `/sign-up`, `/validate`, `/logout` |
| Contas | CRUD `/organizations/:slug/accounts` |
| Cartões | CRUD aninhado em contas |
| Categorias | CRUD `/organizations/:slug/categories` |
| Transações | CRUD + `PATCH .../pay` + `POST .../bulk` |
| Recorrências | CRUD `/organizations/:slug/recurring-transactions` |
| Splits | CRUD + pagamentos parciais |
| Statements | import/list por conta |
| Anexos | upload/download por transação |
| Reports | `/reports/summary`, `/by-account`, `/by-category` |
| Alertas | CRUD `alert-rules`; inbox `notifications` |
| IA | `POST .../ai/chat`, `.../actions/confirm`, `.../reject` |
| Jobs | `/jobs/*` (ver pendências em TODOS) |

Contrato OpenAPI consumido pelo frontend via Orval.

### Jobs

`api/src/jobs/` — materialização de recorrências, avaliação de alertas, etc.

Endpoints administrativos em `api/src/http/routes/jobs.routes.ts`. Relatórios de produto **não** ficam mais aqui — estão em `api/src/modules/reports/`.

### Autenticação

Magic link (e-mail / WhatsApp). Env tipado em `api/src/config/env.ts`. Integrações: Brevo, SMTP, Evolution API.

---

## Frontend (`web/`)

### Stack

- React 19, Vite 7
- TanStack Router (file-based em `web/src/pages/`)
- TanStack Query, Zustand
- Tailwind CSS 4, shadcn/ui, Vaul (drawers)
- Orval → `web/src/api/generated/`

Dev: Vite + Orval watch (`npm run dev`).

### Navegação

Config: `web/src/routes/navigation.ts`

| Item | Rota | Observação |
|------|------|------------|
| Dashboard | `/{org}` | Home com cards modulares |
| Lançamentos | `/{org}/transactions` | Lista, filtros, vencidas |
| Contas | `/{org}/accounts` | Lista + detalhe `/:id` |
| Configurações | `/{org}/settings` | Categorias, alertas, membros |

Sidebar colapsável (`web/src/components/layout/sidebar/`). `/{org}/dashboard` redireciona para `/{org}`.

### Features (`web/src/features/`)

| Feature | Responsabilidade |
|---------|------------------|
| `home/` | Patrimônio, contas, vencidas, splits, gastos |
| `transactions/` | Lista, drawer, KPIs, filtros |
| `accounts/` | CRUD contas/cartões, import PDF |
| `categories/` | Drawer de categoria (cascata) |
| `settings/` | Tabs categorias, alertas, membros |
| `ai/` | Chat panel + cards de confirmação de ação |
| `profile/` | Perfil do usuário |

Layout autenticado: `web/src/pages/_app/layout.tsx` (sidebar, drawer global de transação).

Estado: `web/src/stores/auth.ts`, `web/src/stores/org.ts`, hook `useActiveOrganization`.

---

## Extensão Chrome (`chrome-extension/`)

MV3: `background.js`, `popup.js`, `options.js`.

Popup **simplificado** (~300 linhas): resumo de pendências/vencidas + quick actions. Dashboard completo fica no web.

Permissões: `alarms`, `notifications`, `storage`, `cookies`.

---

## Fluxos funcionais

### Autenticação

1. Usuário informa e-mail ou WhatsApp
2. Backend envia magic link
3. `validate` persiste token no frontend
4. Rotas `/_app/*` exigem autenticação

### Nova transação

1. FAB ou botão abre drawer (`transaction-drawer.tsx`)
2. Campos: conta, cartão (se crédito), categoria, splits, anexos
3. `POST /organizations/:slug/transactions`
4. Home e listas invalidam queries

### Import de fatura

1. Conta → importar PDF (`import-statement-dialog.tsx`)
2. API cria `statement` + transações em bulk (`source=import`)
3. Dedup: `UNIQUE(file_hash, account_id)`

### Divisão de despesa

1. No drawer, seção splits
2. API persiste `transaction_splits`; pagamentos parciais em `split_payments`
3. Home exibe card "Quem me deve"

### Chat IA

1. Panel lateral envia mensagem → SSE
2. Resposta pode incluir `action_preview`
3. Usuário confirma → `POST .../ai/actions/confirm`

---

## Como pensar o sistema

- **Conta** = onde o dinheiro está; **transação** = movimento
- **Organização ativa** = slug na URL + store Zustand
- **Backend** = fonte da verdade; **frontend** = contrato Orval
- **Relatórios** = agregados em `modules/reports`, não calculados no client
- **Lembrete** = transação pendente + `alert_rule`, não entidade separada

---

## Arquivos-chave

### Backend

- `api/src/http/server.ts`
- `api/src/http/routes/index.ts`
- `api/src/core/container.ts`
- `api/src/db/schemas/transactions.ts`
- `api/src/modules/transactions/transaction.routes.ts`
- `api/src/modules/reports/report.routes.ts`
- `api/src/modules/ai/ai.routes.ts`

### Frontend

- `web/src/pages/_app/layout.tsx`
- `web/src/routes/navigation.ts`
- `web/src/features/home/index.tsx`
- `web/src/features/transactions/components/transaction-drawer.tsx`
- `web/src/features/accounts/`
- `web/src/api/generated/api.ts`

---

## Resumo

> HouseApp é um gestor financeiro pessoal org-scoped, com contas e transações no centro, API modular Fastify + Drizzle, frontend React consumindo OpenAPI via Orval, alertas multicanal e assistente IA com ações confirmáveis.
