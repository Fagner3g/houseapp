# Explicação do Projeto HouseApp

## Visão geral

O HouseApp é um monorepo TypeScript voltado para gestão financeira e operacional por organização. Hoje o projeto está dividido em três partes principais:

- `api/`: backend Fastify com autenticação JWT, Drizzle ORM, PostgreSQL, jobs agendados e geração de Swagger.
- `web/`: frontend React + Vite com TanStack Router, TanStack Query, Zustand e cliente HTTP gerado por Orval.
- `chrome-extension/`: extensão Chrome simples para notificações e resumo financeiro.

O domínio principal gira em torno de:

- usuários;
- organizações;
- convites;
- metas;
- tags;
- séries de transações recorrentes;
- ocorrências materializadas dessas transações;
- mensagens/chat vinculadas às transações;
- jobs de alerta e resumo.

## Estrutura do monorepo

Na raiz ficam os scripts e ferramentas compartilhadas:

- `package.json`: scripts de `prepare`, `test` e `precommit`.
- `biome.json`: lint/format.
- `README.md`: visão funcional resumida.
- `VERSIONING.md`: estratégia de versionamento.

As aplicações ficam separadas por pasta:

- `api/` roda de forma independente.
- `web/` roda de forma independente.
- `chrome-extension/` não aparenta ter pipeline de build; é uma extensão MV3 com arquivos estáticos.

## Backend (`api/`)

### Stack

- Fastify 5
- Zod
- `fastify-type-provider-zod`
- Drizzle ORM + `postgres`
- PostgreSQL
- JWT
- Swagger/OpenAPI
- `node-cron` para jobs

### Inicialização

O bootstrap acontece em `api/src/http/server.ts`:

1. valida/setup do banco;
2. execução de migrações pendentes;
3. registro dos jobs;
4. início do monitor de conexão com banco;
5. criação do servidor Fastify;
6. bind em `HOST` e `PORT`;
7. shutdown gracioso para `SIGTERM` e `SIGINT`.

### Configuração do servidor

`api/src/http/utils/setup.ts` concentra a montagem do Fastify:

- CORS liberando `WEB_URL`, localhost e `chrome-extension://`.
- JWT via `@fastify/jwt`.
- parser JSON tolerante a body vazio.
- Swagger em `/docs`.
- geração automática de `api/swagger.json` em desenvolvimento.
- serialização customizada de `bigint`, com `amount` convertido de centavos para decimal string.

### Banco de dados

O backend usa Drizzle com schema declarado em `api/src/db/schemas`.

Entidades principais:

- `users`
- `organizations`
- `userOrganizations`
- `invites`
- `goals`
- `goalCompletions`
- `tags`
- `transactionSeries`
- `transactionOccurrences`
- `transactionTags`
- `transactionChatMessages`

#### Modelo de transações

O projeto não trata transação como um único registro simples. Ele separa:

- `transactionSeries`: definição da transação recorrente ou parcelada;
- `transactionOccurrences`: parcelas/competências materializadas que serão exibidas, pagas e alertadas.

Na prática:

1. o usuário cria uma série;
2. tags são associadas à série;
3. o domínio materializa as próximas ocorrências;
4. jobs e telas operam sobre essas ocorrências.

Isso explica por que várias telas falam em transação, mas o backend também usa `seriesId`.

### Setup e migrações

`api/src/db/setup.ts` faz bastante trabalho automaticamente:

- testa conexão com o PostgreSQL;
- cria o banco se ele não existir;
- verifica migrações pendentes;
- executa `drizzle-kit migrate`;
- registra logs detalhados do processo.

Esse comportamento é conveniente localmente, mas significa que subir a API já tenta preparar o banco.

### Organização do código

O backend segue uma separação razoável entre:

- `src/http/routes`: definição das rotas;
- `src/http/controllers`: camada HTTP;
- `src/domain`: regra de negócio;
- `src/db`: acesso ao banco e schema;
- `src/jobs`: jobs agendados;
- `src/lib`: logger, mail, monitor e helpers.

### Autenticação

O fluxo de autenticação suporta login por link mágico. Há suporte a e-mail e WhatsApp no frontend, e o backend possui integrações para envio por:

- Brevo;
- SMTP legado;
- Evolution API / WhatsApp.

As variáveis de ambiente ficam tipadas em `api/src/config/env.ts`.

### Jobs

O sistema de jobs fica em `api/src/jobs` e usa um `JobRegistry` central para:

- validar jobs registrados;
- iniciar/parar jobs;
- executar jobs manualmente;
- expor status.

Jobs identificados:

- materialização de ocorrências;
- alertas de transações;
- alertas de vencidas.

Além do agendamento, a API expõe endpoints administrativos para:

- listar jobs;
- iniciar/parar jobs;
- rodar jobs sob demanda;
- fazer preview de alertas;
- gerar resumo mensal.

### Relatórios e dashboard

O agregado do dashboard está em `api/src/domain/reports/dashboard.ts`.

Esse módulo produz:

- KPIs do mês;
- distribuição por status;
- gráficos diários;
- breakdown por tags;
- transações vencidas;
- alertas próximos;
- contraparte de valores a receber e a pagar;
- pagos no mês.

Um detalhe importante do projeto atual:

- `api/src/http/routes/reports.routes.ts` está vazio;
- mas as rotas de relatórios continuam existindo dentro de `api/src/http/routes/jobs.routes.ts`.

Ou seja: funcionalmente o dashboard ainda depende desses relatórios, mas a organização das rotas está inconsistente com o nome dos arquivos.

## Frontend (`web/`)

### Stack

- React 19
- Vite 7
- TanStack Router com file-based routing
- TanStack Query
- Zustand
- Tailwind CSS 4
- Radix UI / componentes utilitários
- Orval para geração do cliente da API

### Boot da aplicação

O entrypoint está em `web/src/main.tsx`, que monta `App`.

`web/src/App.tsx` aplica:

- `ThemeProvider`;
- `QueryProvider`;
- `RouterProvider`;
- `Toaster`.

### Roteamento

O roteamento usa o plugin do TanStack Router apontando para `web/src/pages`.

Pontos importantes:

- `web/src/pages/__root.tsx`: rota raiz.
- `web/src/pages/_auth/*`: fluxo público.
- `web/src/pages/_app/*`: área autenticada.
- `web/src/pages/_app/$org/*`: área contextualizada por organização.

O layout autenticado em `web/src/pages/_app/layout.tsx`:

- valida existência de token;
- revalida autenticação após hidratação;
- renderiza header, sidebar e drawer global de transações.

### Estado de autenticação e organização

O frontend usa Zustand para dois estados centrais:

- `web/src/stores/auth.ts`: usuário autenticado, status e persistência local;
- `web/src/stores/org.ts`: slug da organização ativa.

`useAuthHydration` e `useIsAuthenticated` evitam redirecionamento prematuro antes da reidratação do storage.

`useActiveOrganization` extrai o slug da URL e sincroniza com o store.

### Consumo da API

O cliente da API é gerado em `web/src/api/generated` por Orval usando `api/swagger.json`.

Isso cria duas consequências importantes:

1. o contrato da API usado pelo frontend depende do Swagger gerado pela API;
2. quando rotas mudam no backend, é preciso regenerar o cliente do frontend.

O comando de desenvolvimento do frontend roda dois processos:

- Vite;
- Orval em modo watch.

### Módulos funcionais no frontend

Os grupos principais observados:

- autenticação: `sign-in`, `sign-up`, `validate`, `invite`;
- dashboard: `web/src/pages/_app/$org/(dashboard)`;
- transações: `web/src/pages/_app/$org/(transactions)`;
- usuários: `web/src/pages/_app/$org/(user)`;
- settings: `web/src/pages/_app/$org/(settings)`;
- jobs/admin: `web/src/pages/_app/$org/(admin)/jobs.tsx`.

#### Dashboard

A tela de dashboard:

- busca relatório mensal por organização;
- permite trocar mês e ano;
- reaproveita o drawer de edição de transação;
- invalida queries relacionadas após edição.

#### Transações

A área de transações trabalha com filtros via search params:

- tags;
- tipo;
- período;
- paginação;
- visualização;
- responsável;
- marcadas.

O módulo parece ser uma das partes mais completas do sistema.

## Extensão Chrome (`chrome-extension/`)

A extensão usa Manifest V3 e inclui:

- `background.js`
- `popup.html` / `popup.js`
- `options.html` / `options.js`

Permissões observadas:

- `alarms`
- `notifications`
- `storage`
- `cookies`

Ela parece pensada para complementar o sistema de alertas e resumo financeiro, mas está isolada do pipeline principal.

## Fluxo funcional resumido

### Autenticação

1. usuário informa e-mail ou WhatsApp;
2. backend envia link mágico;
3. token é validado;
4. frontend persiste estado autenticado;
5. navegação protegida passa a depender do token e do store.

### Transações

1. usuário cria uma série de transação;
2. tags podem ser criadas/reutilizadas;
3. ocorrências futuras são materializadas;
4. listagens e dashboard operam sobre essas ocorrências;
5. pagamento, edição e alertas atualizam o estado derivado.

### Organização

1. usuário cria ou acessa organização;
2. slug entra na URL;
3. hooks e stores usam esse slug para todas as queries;
4. regras de autorização verificam vínculo do usuário com a organização.

## Como rodar mentalmente o projeto

Quando você estiver investigando bugs ou implementando features, pense no sistema assim:

- o backend é o centro da regra de negócio;
- o frontend é fortemente acoplado ao OpenAPI gerado;
- o dashboard não é “manual”, ele é um agregado calculado pelo backend;
- transação recorrente = série + ocorrências;
- organização ativa = parte do path e também do estado global;
- jobs fazem parte do produto, não só da infraestrutura.

## Pontos de atenção encontrados

- O nome dos arquivos de rotas não reflete totalmente o comportamento atual: relatórios estão servidos por `jobs.routes.ts`, enquanto `reports.routes.ts` está vazio.
- O frontend depende de código gerado por Orval; se o `swagger.json` ficar desatualizado, o cliente também fica.
- O setup da API cria banco e roda migrações na subida. Isso é útil, mas aumenta o acoplamento do boot com infraestrutura.
- Existem sinais de evolução contínua do domínio financeiro, então mudanças em transações costumam impactar dashboard, jobs e cliente gerado ao mesmo tempo.

## Arquivos-chave para começar a navegar

- `api/src/http/server.ts`
- `api/src/http/utils/setup.ts`
- `api/src/http/routes/index.ts`
- `api/src/http/routes/jobs.routes.ts`
- `api/src/domain/reports/dashboard.ts`
- `api/src/domain/transactions/create-transaction.ts`
- `api/src/db/setup.ts`
- `api/src/db/schemas/transactionSeries.ts`
- `api/src/db/schemas/transactionOccurrences.ts`
- `web/src/App.tsx`
- `web/src/routes/index.tsx`
- `web/src/pages/_app/layout.tsx`
- `web/src/pages/_app/$org/(dashboard)/dashboard.tsx`
- `web/src/pages/_app/$org/(transactions)/transactions.tsx`
- `web/src/stores/auth.ts`
- `web/src/hooks/use-active-organization.ts`
- `web/src/api/generated/api.ts`

## Resumo curto

Se eu tivesse que resumir o projeto em uma frase:

> HouseApp é um monorepo de gestão financeira por organização, com backend orientado a séries/ocorrências de transações, frontend baseado em contrato OpenAPI gerado e uma camada de jobs que participa diretamente do produto.
